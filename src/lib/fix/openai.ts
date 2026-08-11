import OpenAI from "openai";
import { costUsd, MAX_COST_PER_FIX_USD, type FixModel } from "./pricing";
import { buildFixPrompt, PATCH_SCHEMA, SYSTEM_PROMPT, type ParsedPatch } from "./prompt";
import type { FixPlanItem, FixResult, RepoContext, TokenUsage } from "./types";

/**
 * The GPT path — the cost-routing default. Most Autofix findings (disabled_cta,
 * lazy_content, js_only_content) are mechanical enough that GPT-5 mini/nano handles them
 * at a small fraction of Claude's cost; only empty_shell (the hardest case) stays on
 * Claude Opus (see anthropic.ts). Both providers run the identical system prompt and
 * output schema from prompt.ts, so which model handled a fix should never be visible in
 * the quality of the result.
 *
 * Uses Chat Completions rather than the Responses API — it is the more stable, longer
 * documented surface for constrained JSON generation and needed no beta opt-in to verify.
 */

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

let cached: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  if (!cached) cached = new OpenAI();
  return cached;
}

export async function fixWithOpenAI(
  item: FixPlanItem,
  repo: RepoContext,
  opts: { model: FixModel; relevantFiles: Array<{ path: string; contents: string }> }
): Promise<FixResult> {
  const { model } = opts;
  const client = getClient();

  const { repoContext, finding } = buildFixPrompt(repo, item, opts.relevantFiles);

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 16_000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        // No native prompt-cache breakpoint on this API the way Anthropic has one — the
        // repo context still leads the user turn so it's identical across fixes in a job,
        // which is what OpenAI's automatic prompt caching keys off.
        { role: "user", content: `${repoContext}\n\n${finding}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "site_patch", schema: PATCH_SCHEMA, strict: true },
      },
    });

    const choice = response.choices[0];

    const usage: TokenUsage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      // Not modelled on this path — see the cost-accounting note in pricing.ts.
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    };
    const spent = costUsd(usage, model);

    // Structured-output refusals surface as a populated `refusal` field rather than a
    // distinct stop reason — check it before trusting `content`.
    const refusal = (choice.message as { refusal?: string | null }).refusal;
    if (refusal) {
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

    if (choice.finish_reason !== "stop") {
      return {
        issueKey: item.issueKey,
        strategy: "llm",
        ok: false,
        title: item.title,
        changes: [],
        explanation: "",
        error: `Generation stopped early (${choice.finish_reason}) — no patch applied.`,
        usage,
        costUsd: spent,
      };
    }

    const content = choice.message.content;
    if (!content) {
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

    const parsed = JSON.parse(content) as ParsedPatch;

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
