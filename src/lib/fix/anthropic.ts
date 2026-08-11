import Anthropic from "@anthropic-ai/sdk";
import { costUsd, DEFAULT_FIX_MODEL, MAX_COST_PER_FIX_USD, type FixModel } from "./pricing";
import { buildFixPrompt, PATCH_SCHEMA, SYSTEM_PROMPT, type ParsedPatch } from "./prompt";
import type { FixPlanItem, FixResult, RepoContext, TokenUsage } from "./types";

/**
 * The Claude path — reserved for `empty_shell`, the hardest issue type Autofix handles.
 * Patch quality is the product there, so it stays on the strongest model regardless of the
 * cost-routing that sends everything else to GPT (see router.ts and openai.ts).
 *
 * Cost control here rests on two things:
 *  1. Prompt caching. Repo context is identical for every fix in a job and is marked as
 *     the cacheable prefix, so fix #2 onward reads it at ~10% of the input rate instead
 *     of re-paying for the whole thing.
 *  2. Effort. Opus 5 performs unusually well at `low`/`medium`, and effort is the primary
 *     cost lever on that model.
 *  3. Structured output. The model returns a typed patch object, so there is no second
 *     round trip to parse prose into file changes.
 */

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (!cached) cached = new Anthropic();
  return cached;
}

/** Complex, multi-file issues get more headroom; single-element fixes do not. */
function effortFor(issueKey: string): "low" | "medium" | "high" {
  switch (issueKey) {
    case "empty_shell":
      return "high";
    default:
      return "medium";
  }
}

export async function fixWithClaude(
  item: FixPlanItem,
  repo: RepoContext,
  opts: { model?: FixModel; relevantFiles: Array<{ path: string; contents: string }> }
): Promise<FixResult> {
  const model = opts.model ?? DEFAULT_FIX_MODEL;
  const client = getClient();

  const { repoContext, finding } = buildFixPrompt(repo, item, opts.relevantFiles);

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16_000,
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        {
          type: "text",
          text: repoContext,
          // The breakpoint: repo context is the stable prefix, cached across the job.
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        effort: effortFor(item.issueKey),
        format: { type: "json_schema", schema: PATCH_SCHEMA },
      },
      messages: [{ role: "user", content: finding }],
    });

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    };
    const spent = costUsd(usage, model);

    // A refusal returns HTTP 200 with an empty or partial content array — reading
    // content[0] unconditionally would throw here rather than surface the real reason.
    if (response.stop_reason === "refusal") {
      return {
        issueKey: item.issueKey,
        strategy: "llm",
        ok: false,
        title: item.title,
        changes: [],
        explanation: "",
        error: "The model declined to produce a change for this finding.",
        usage,
        costUsd: spent,
      };
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        issueKey: item.issueKey,
        strategy: "llm",
        ok: false,
        title: item.title,
        changes: [],
        explanation: "",
        error: "No patch was returned.",
        usage,
        costUsd: spent,
      };
    }

    const parsed = JSON.parse(textBlock.text) as ParsedPatch;

    if (!parsed.confident || parsed.changes.length === 0) {
      return {
        issueKey: item.issueKey,
        strategy: "llm",
        ok: false,
        title: item.title,
        changes: [],
        explanation: parsed.explanation,
        error: "Not enough context to make this change safely — skipped rather than guessed.",
        usage,
        costUsd: spent,
      };
    }

    if (spent > MAX_COST_PER_FIX_USD) {
      // Already spent, but flagged so a systematically expensive issue type shows up
      // in the margin data instead of quietly eroding it.
      console.warn(
        `[autofix] ${item.issueKey} cost $${spent.toFixed(2)}, above the $${MAX_COST_PER_FIX_USD} per-fix ceiling`
      );
    }

    return {
      issueKey: item.issueKey,
      strategy: "llm",
      ok: true,
      title: item.title,
      changes: parsed.changes,
      explanation: parsed.explanation,
      usage,
      costUsd: spent,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Autofix failed";
    return {
      issueKey: item.issueKey,
      strategy: "llm",
      ok: false,
      title: item.title,
      changes: [],
      explanation: "",
      error: message,
      costUsd: 0,
    };
  }
}
