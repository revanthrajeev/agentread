import Anthropic from "@anthropic-ai/sdk";
import { costUsd, DEFAULT_FIX_MODEL, MAX_COST_PER_FIX_USD, type FixModel } from "./pricing";
import type { FileChange, FixPlanItem, FixResult, RepoContext, TokenUsage } from "./types";

/**
 * The metered fixer — used only for issues the router couldn't solve deterministically.
 *
 * Cost control here rests on three things:
 *  1. Prompt caching. Repo context is identical for every fix in a job and is marked as
 *     the cacheable prefix, so fix #2 onward reads it at ~10% of the input rate instead
 *     of re-paying for the whole thing.
 *  2. Effort. Opus 5 performs unusually well at `low`/`medium`, and effort is the primary
 *     cost lever on that model — a single-file CTA fix does not need `xhigh`.
 *  3. Structured output. The model returns a typed patch object, so there is no second
 *     round trip to parse prose into file changes.
 */

export function isAutofixConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — Autofix is not configured.");
  }
  if (!cached) cached = new Anthropic();
  return cached;
}

/** Complex, multi-file issues get more headroom; single-element fixes do not. */
function effortFor(issueKey: string): "low" | "medium" | "high" {
  switch (issueKey) {
    case "disabled_cta":
    case "lazy_content":
      return "low";
    case "js_only_content":
      return "medium";
    case "empty_shell":
      return "high";
    default:
      return "medium";
  }
}

const PATCH_SCHEMA = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
      description:
        "What was changed and why, in two or three sentences, addressed to the developer reviewing the pull request.",
    },
    changes: {
      type: "array",
      description:
        "Files to write. Each entry replaces the file wholesale, so `contents` must be the complete final file, not a diff or a fragment.",
      items: {
        type: "object",
        properties: {
          path: { type: "string", description: "Repository-relative path." },
          contents: { type: "string", description: "Complete new contents of the file." },
          rationale: {
            type: "string",
            description: "One sentence on why this specific file changed.",
          },
        },
        required: ["path", "contents", "rationale"],
        additionalProperties: false,
      },
    },
    /** Lets the model decline rather than invent a change it isn't confident in. */
    confident: {
      type: "boolean",
      description:
        "False if the provided context was insufficient to make a correct change. Prefer returning false over guessing.",
    },
  },
  required: ["explanation", "changes", "confident"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You fix websites so AI agents can read them, without changing what humans see.

You are given a repository's structure, a set of relevant source files, and one specific finding from an audit of the deployed site. Produce the minimal code change that resolves that finding.

Rules:
- Change as little as possible. A finding about one component is not licence to refactor the module.
- Never alter the rendered experience for human visitors. These fixes are about what exists in the server-rendered markup, not about visual design.
- Return complete file contents, never diffs or fragments — your output is written to disk verbatim.
- Match the surrounding code: its formatting, naming, imports, and idioms.
- Only write a comment to state a constraint the code cannot show. Do not narrate what the next line does.
- If the context you were given is not enough to make the change correctly, set confident to false and return no changes. A pull request that has to be reverted costs the user far more than one that was never opened.`;

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
  const model = opts.model ?? DEFAULT_FIX_MODEL;
  const client = getClient();

  // Everything above the cache breakpoint is identical across every fix in this job.
  // Volatile per-fix content (the finding itself) goes after it, so the prefix survives.
  const repoContext = [
    `# Repository: ${repo.owner}/${repo.repo}`,
    `Framework: ${repo.framework}`,
    `Default branch: ${repo.defaultBranch}`,
    ``,
    `## File tree`,
    repo.tree.slice(0, 2000).join("\n"),
    ``,
    `## Key files`,
    ...repo.keyFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.contents}\n\`\`\``),
  ].join("\n");

  const finding = [
    `## Finding to fix`,
    `${item.title}`,
    ``,
    item.description,
    ``,
    item.affectedUrls.length ? `Affected pages:\n${item.affectedUrls.map((u) => `- ${u}`).join("\n")}` : "",
    ``,
    `## Files likely involved`,
    ...opts.relevantFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.contents}\n\`\`\``),
  ]
    .filter(Boolean)
    .join("\n");

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

    const parsed = JSON.parse(textBlock.text) as {
      explanation: string;
      changes: FileChange[];
      confident: boolean;
    };

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
