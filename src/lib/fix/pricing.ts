import type { TokenUsage } from "./types";

/**
 * Inference cost accounting and the margin guard.
 *
 * Two things this file exists to prevent:
 *  1. Selling a fix for less than it costs to produce (the margin guard aborts a job
 *     whose projected spend exceeds what the customer's credits cover).
 *  2. Guessing at unit economics. Every number below is a real published rate, and every
 *     fix records what it actually cost so gross margin is measured, not assumed.
 *
 * Two providers, because the router (see router.ts) sends each issue to whichever model is
 * cheapest for work of that difficulty — not to whichever model the app happens to default
 * to. Rates confirmed against each provider's pricing page, 2026-08.
 */

/** USD per million tokens. Rates for the models this feature is allowed to use. */
export const MODEL_RATES = {
  "claude-opus-5": { input: 5.0, output: 25.0 },
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  // GPT-5 mini/nano: OpenAI's cheapest tier capable of constrained JSON generation.
  // Used for the two issue types closest to mechanical (disabled_cta, lazy_content) and
  // one step up for js_only_content — see router.ts for the per-issue assignment.
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
} as const;

export type FixModel = keyof typeof MODEL_RATES;

export type FixProvider = "anthropic" | "openai";

export const MODEL_PROVIDER: Record<FixModel, FixProvider> = {
  "claude-opus-5": "anthropic",
  "claude-sonnet-5": "anthropic",
  "claude-haiku-4-5": "anthropic",
  "gpt-5-mini": "openai",
  "gpt-5-nano": "openai",
};

/**
 * The fallback model when a route doesn't specify one. Every LLM route in router.ts sets
 * its own model explicitly, so this only matters for the empty_shell case (patch quality
 * is the product there, so it stays Opus) and as a safe default if a route is ever added
 * without one.
 */
export const DEFAULT_FIX_MODEL: FixModel = "claude-opus-5";

/**
 * Prompt-cache multipliers — Anthropic only.
 *
 * A cache read is ~10% of the base input rate; the write that seeds it costs 1.25× (5-minute
 * TTL). Repo context is identical across every fix in a job, so fix #2 onward reads the
 * cache instead of re-paying for the whole prefix.
 *
 * OpenAI's prompt caching works differently — cached tokens are billed automatically at a
 * discount with no separate "write" charge — but the exact accounting isn't modelled here.
 * Deliberately conservative: GPT costs below are computed on raw prompt+completion tokens
 * with no cache discount applied, so the real cost is likely *lower* than what's reported,
 * never higher. An estimate that under-claims savings is safer than one that over-claims them.
 */
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export function costUsd(usage: TokenUsage, model: FixModel = DEFAULT_FIX_MODEL): number {
  const rate = MODEL_RATES[model];
  const perInputToken = rate.input / 1_000_000;
  const perOutputToken = rate.output / 1_000_000;

  if (MODEL_PROVIDER[model] === "openai") {
    // No cache-aware terms — see the note above. inputTokens already carries the full
    // prompt token count for the OpenAI path (see openai.ts).
    return usage.inputTokens * perInputToken + usage.outputTokens * perOutputToken;
  }

  return (
    usage.inputTokens * perInputToken +
    usage.cacheCreationInputTokens * perInputToken * CACHE_WRITE_MULTIPLIER +
    usage.cacheReadInputTokens * perInputToken * CACHE_READ_MULTIPLIER +
    usage.outputTokens * perOutputToken
  );
}

/** Typical generated-patch size. Used only for pre-flight estimates, never for billing. */
const ASSUMED_OUTPUT_TOKENS = 6_000;

/**
 * Pre-flight estimate for a single LLM fix. Deliberately assumes a *cold* cache on the
 * Anthropic path — an estimate that under-projects is worse than one that over-projects,
 * because the margin guard runs off it. The OpenAI path has no cache term to assume away.
 */
export function estimateFixCostUsd(
  inputTokens: number,
  model: FixModel = DEFAULT_FIX_MODEL
): number {
  if (MODEL_PROVIDER[model] === "openai") {
    return costUsd(
      {
        inputTokens,
        outputTokens: ASSUMED_OUTPUT_TOKENS,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      },
      model
    );
  }

  return costUsd(
    {
      inputTokens: 0,
      outputTokens: ASSUMED_OUTPUT_TOKENS,
      cacheCreationInputTokens: inputTokens,
      cacheReadInputTokens: 0,
    },
    model
  );
}

/**
 * What one Autofix credit sells for, and the floor its cost must stay under.
 *
 * A typical LLM fix costs well under this on either provider — Claude Opus on the hardest
 * issue (empty_shell) runs roughly $0.20–0.45 with a warm cache; GPT-5 nano/mini on the
 * mechanical issues run a small fraction of a cent. Pricing a credit at $3 keeps gross
 * margin above 85% even on the expensive path, and deterministic fixes — which consume no
 * credit at all — cost nothing to deliver.
 */
export const CREDIT_PRICE_USD = 3.0;

/** Abort a single fix whose inference cost exceeds this. Protects against a runaway job. */
export const MAX_COST_PER_FIX_USD = 1.5;

/** Abort a whole job past this. A pathological repo shouldn't be able to spend unbounded. */
export const MAX_COST_PER_JOB_USD = 12.0;

export interface MarginCheck {
  allowed: boolean;
  projectedCostUsd: number;
  projectedRevenueUsd: number;
  marginPct: number;
  reason?: string;
}

/**
 * Decides whether a planned job is worth running. Called before any inference happens,
 * so a job that can't clear the floor costs nothing to reject.
 */
export function checkMargin(llmFixCount: number, projectedCostUsd: number): MarginCheck {
  const projectedRevenueUsd = llmFixCount * CREDIT_PRICE_USD;
  const marginPct =
    projectedRevenueUsd > 0
      ? ((projectedRevenueUsd - projectedCostUsd) / projectedRevenueUsd) * 100
      : 100;

  if (projectedCostUsd > MAX_COST_PER_JOB_USD) {
    return {
      allowed: false,
      projectedCostUsd,
      projectedRevenueUsd,
      marginPct,
      reason: `Projected inference cost $${projectedCostUsd.toFixed(2)} exceeds the per-job ceiling of $${MAX_COST_PER_JOB_USD.toFixed(2)}. Narrow the audit or fix fewer issues at once.`,
    };
  }

  // A job that would lose money is a bug in the plan, not something to quietly absorb.
  if (projectedRevenueUsd > 0 && marginPct < 0) {
    return {
      allowed: false,
      projectedCostUsd,
      projectedRevenueUsd,
      marginPct,
      reason: "Projected cost exceeds the value of the credits this job would consume.",
    };
  }

  return { allowed: true, projectedCostUsd, projectedRevenueUsd, marginPct };
}

export function formatUsd(n: number): string {
  return n < 0.01 && n > 0 ? `<$0.01` : `$${n.toFixed(2)}`;
}
