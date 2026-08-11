import type { ReadFlag } from "@/lib/engine/read";
import type { FixModel } from "./pricing";

/**
 * Autofix — turns a ReadScore finding into an actual code change.
 *
 * The economics of this feature live in the routing decision, not the model choice:
 * most ReadScore deductions have a deterministic fix (a file we can generate from data
 * we already hold), and only a minority genuinely require reading the customer's source.
 * Every finding routed to `deterministic` is a fix delivered at zero inference cost.
 */

export type FixStrategy =
  /** Generated from data we already have. No model call, no marginal cost. */
  | "deterministic"
  /** Needs to read and modify the customer's source. Costs inference. */
  | "llm"
  /** No safe automated fix — reported, never patched. */
  | "advisory";

export interface FixPlanItem {
  /** Stable key for the underlying issue, used for routing and dedupe. */
  issueKey: string;
  strategy: FixStrategy;
  severity: ReadFlag["severity"];
  title: string;
  /** What the fix will do, in the user's terms. */
  description: string;
  /** Pages exhibiting this issue (bounded — the model doesn't need all of them). */
  affectedUrls: string[];
  /** Rough input-token estimate for LLM items; 0 for deterministic ones. */
  estimatedTokens: number;
  /** Which model handles this issue, for `llm` items — set by router.ts's routing table. */
  model?: FixModel;
}

export interface FixPlan {
  auditId: string;
  host: string;
  items: FixPlanItem[];
  deterministicCount: number;
  llmCount: number;
  advisoryCount: number;
  /** Estimated inference cost in USD for the LLM items. */
  estimatedCostUsd: number;
}

/** A single file change. `patch` semantics are whole-file replacement — no diff parsing. */
export interface FileChange {
  path: string;
  contents: string;
  /** Why this file changed, surfaced in the PR body. */
  rationale: string;
}

export interface FixResult {
  issueKey: string;
  strategy: FixStrategy;
  ok: boolean;
  title: string;
  changes: FileChange[];
  explanation: string;
  error?: string;
  usage?: TokenUsage;
  costUsd: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

/** Minimal view of a repository the fixer needs in order to reason about it. */
export interface RepoContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  /** Paths only — the tree is cheap context; file bodies are fetched on demand. */
  tree: string[];
  /** Detected framework, used to pick file conventions (e.g. Next.js `public/`). */
  framework: string;
  /** Contents of a small set of high-signal files (package.json, config). */
  keyFiles: Array<{ path: string; contents: string }>;
}
