import type { TokenUsage } from "./types";

/**
 * Inference cost accounting and the margin guard.
 *
 * Two things this file exists to prevent:
 *  1. Selling a fix for less than it costs to produce (the margin guard aborts a job
 *     whose projected spend exceeds what the customer's credits cover).
 *  2. Guessing at unit economics. Every number below is a real rate, and every fix
 *     records what it actually cost so gross margin is measured, not assumed.
 */

/** USD per million tokens. Rates for the models this feature is allowed to use. */
export const MODEL_RATES = {
  "claude-opus-5": { input: 5.0, output: 25.0 },
  "claude-sonnet-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
} as const;

export type FixModel = keyof typeof MODEL_RATES;

/** The model Autofix runs on. Patch quality is the product here, so this is the Opus tier. */
export const DEFAULT_FIX_MODEL: FixModel = "claude-opus-5";

/**
 * Prompt-cache multipliers. A cache read is ~10% of the base input rate; the write that
 * seeds it costs 1.25× (5-minute TTL). Repo context is identical across every fix in a
 * job, so fix #2 onward reads the cache instead of re-paying for the whole prefix.
 */
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

export function costUsd(usage: TokenUsage, model: FixModel = DEFAULT_FIX_MODEL): number {
  const rate = MODEL_RATES[model];
  const perInputToken = rate.input / 1_000_000;
  const perOutputToken = rate.output / 1_000_000;

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
 * Pre-flight estimate for a single LLM fix. Deliberately assumes a *cold* cache — an
 * estimate that under-projects is worse than one that over-projects, because the margin
 * guard runs off it.
 */
export function estimateFixCostUsd(
  inputTokens: number,
  model: FixModel = DEFAULT_FIX_MODEL
): number {
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
 * A typical LLM fix costs roughly $0.20–0.45 of inference (see estimateFixCostUsd with a
 * 40–50k-token repo context). Pricing a credit at $3 keeps gross margin above 85% even
 * when a fix runs long, and deterministic fixes — which consume no credit at all — cost
 * nothing to deliver.
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
