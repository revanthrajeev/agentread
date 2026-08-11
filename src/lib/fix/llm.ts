import { fixWithClaude, isAnthropicConfigured } from "./anthropic";
import { fixWithOpenAI, isOpenAIConfigured } from "./openai";
import { DEFAULT_FIX_MODEL, MODEL_PROVIDER, type FixModel } from "./pricing";
import type { FixPlanItem, FixResult, RepoContext } from "./types";

/**
 * The metered-fix dispatcher — used only for issues the router couldn't solve
 * deterministically. Picks the provider by looking up the model the router assigned
 * (see router.ts's ROUTES table) in MODEL_PROVIDER, then calls that provider's fixer.
 *
 * Callers (runner.ts) don't need to know two providers exist — the split into
 * anthropic.ts / openai.ts exists so each provider's transport, auth, and response
 * parsing stays in one place, while both run the identical prompt and schema from
 * prompt.ts.
 */

export function isAutofixConfigured(): boolean {
  return isAnthropicConfigured() || isOpenAIConfigured();
}

interface FixLlmOptions {
  model?: FixModel;
  /** Files the caller believes are relevant, already fetched. */
  relevantFiles: Array<{ path: string; contents: string }>;
}

export async function fixWithLlm(
  item: FixPlanItem,
  repo: RepoContext,
  opts: FixLlmOptions
): Promise<FixResult> {
  const model = opts.model ?? item.model ?? DEFAULT_FIX_MODEL;
  const provider = MODEL_PROVIDER[model];

  if (provider === "openai") {
    if (!isOpenAIConfigured()) {
      return unconfigured(item, "OPENAI_API_KEY is not set on this deployment.");
    }
    return fixWithOpenAI(item, repo, { model, relevantFiles: opts.relevantFiles });
  }

  if (!isAnthropicConfigured()) {
    return unconfigured(item, "ANTHROPIC_API_KEY is not set on this deployment.");
  }
  return fixWithClaude(item, repo, { model, relevantFiles: opts.relevantFiles });
}

function unconfigured(item: FixPlanItem, error: string): FixResult {
  return {
    issueKey: item.issueKey,
    strategy: "llm",
    ok: false,
    title: item.title,
    changes: [],
    explanation: "",
    error,
    costUsd: 0,
  };
}
