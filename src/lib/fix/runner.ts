import type { AuditResult } from "@/lib/engine/crawl";
import { fixLlmsTxt, fixRobotsTxt, fixServeMiddleware } from "./deterministic";
import { fixWithLlm, isAutofixConfigured } from "./llm";
import { checkMargin, formatUsd, MAX_COST_PER_JOB_USD } from "./pricing";
import { planFixes } from "./router";
import type { FileChange, FixPlan, FixResult } from "./types";
import type { SourceAdapter } from "./adapter";

/**
 * Orchestrates a full Autofix run: plan → deterministic fixes → metered fixes → one PR.
 *
 * Ordering is deliberate. Deterministic fixes run first and unconditionally, so even a
 * job that later hits its cost ceiling still ships the free wins. Metered fixes run
 * afterwards against a running cost total and stop the moment the ceiling is reached.
 */

export interface AutofixJobResult {
  plan: FixPlan;
  results: FixResult[];
  totalCostUsd: number;
  creditsConsumed: number;
  pullRequest: { url: string; number: number; branch: string } | null;
  stoppedEarly: boolean;
  error?: string;
}

/** Heuristic file selection — cheaper and more predictable than a model-driven search. */
function candidateFilesFor(issueKey: string, tree: string[]): string[] {
  const patterns: Record<string, RegExp> = {
    js_only_content: /(price|pricing|product|checkout|cart|plan)[^/]*\.(tsx?|jsx?|vue|svelte|astro)$/i,
    disabled_cta: /(button|cta|buy|checkout|purchase)[^/]*\.(tsx?|jsx?|vue|svelte|astro)$/i,
    empty_shell: /(app|pages|routes)\/.*(page|index|layout)\.(tsx?|jsx?|vue|svelte|astro)$/i,
    lazy_content: /(lazy|defer|carousel|gallery|section)[^/]*\.(tsx?|jsx?|vue|svelte|astro)$/i,
  };

  const pattern = patterns[issueKey];
  if (!pattern) return [];

  const matched = tree.filter((p) => pattern.test(p)).slice(0, 6);
  if (matched.length > 0) return matched;

  // Nothing matched by name — fall back to the app's entry points, which is where
  // server-rendered content lives in every framework we detect.
  return tree
    .filter((p) => /(app|pages|src)\/.*(page|index|layout)\.(tsx?|jsx?|vue|svelte|astro)$/i.test(p))
    .slice(0, 4);
}

export async function runAutofix(
  auditId: string,
  audit: AuditResult,
  adapter: SourceAdapter,
  opts: { maxLlmFixes?: number; dryRun?: boolean } = {}
): Promise<AutofixJobResult> {
  const plan = planFixes(auditId, audit);
  const results: FixResult[] = [];
  let totalCostUsd = 0;
  let stoppedEarly = false;

  const margin = checkMargin(plan.llmCount, plan.estimatedCostUsd);
  if (!margin.allowed) {
    return {
      plan,
      results: [],
      totalCostUsd: 0,
      creditsConsumed: 0,
      pullRequest: null,
      stoppedEarly: true,
      error: margin.reason,
    };
  }

  const repo = await adapter.loadContext();

  // ---- Deterministic pass: always runs, always free ------------------------------
  for (const item of plan.items.filter((i) => i.strategy === "deterministic")) {
    switch (item.issueKey) {
      case "missing_llms_txt":
        results.push(fixLlmsTxt(audit, repo));
        break;
      case "missing_ai_crawler_rules": {
        const dir = repo.framework === "sveltekit" || repo.framework === "gatsby" ? "static" : "public";
        const existing = await adapter.readFile(`${dir}/robots.txt`);
        results.push(fixRobotsTxt(repo, existing));
        break;
      }
      case "missing_serve_middleware":
        results.push(fixServeMiddleware(repo));
        break;
    }
  }

  // ---- Metered pass: bounded by plan, by count, and by running spend --------------
  const llmItems = plan.items
    .filter((i) => i.strategy === "llm")
    .slice(0, opts.maxLlmFixes ?? 5);

  if (llmItems.length > 0 && !isAutofixConfigured()) {
    results.push({
      issueKey: "llm_unavailable",
      strategy: "llm",
      ok: false,
      title: "Code fixes unavailable",
      changes: [],
      explanation: "",
      error: "ANTHROPIC_API_KEY is not set on this deployment — only deterministic fixes ran.",
      costUsd: 0,
    });
  } else {
    for (const item of llmItems) {
      if (totalCostUsd >= MAX_COST_PER_JOB_USD) {
        stoppedEarly = true;
        break;
      }

      const paths = candidateFilesFor(item.issueKey, repo.tree);
      const relevantFiles: Array<{ path: string; contents: string }> = [];
      for (const p of paths) {
        const contents = await adapter.readFile(p);
        if (contents) relevantFiles.push({ path: p, contents: contents.slice(0, 30_000) });
      }

      const result = await fixWithLlm(item, repo, { relevantFiles });
      totalCostUsd += result.costUsd;
      results.push(result);
    }
  }

  const allChanges: FileChange[] = results.filter((r) => r.ok).flatMap((r) => r.changes);

  if (allChanges.length === 0) {
    return {
      plan,
      results,
      totalCostUsd,
      creditsConsumed: results.filter((r) => r.strategy === "llm" && r.ok).length,
      pullRequest: null,
      stoppedEarly,
      error: "No changes were produced.",
    };
  }

  if (opts.dryRun) {
    return {
      plan,
      results,
      totalCostUsd,
      creditsConsumed: results.filter((r) => r.strategy === "llm" && r.ok).length,
      pullRequest: null,
      stoppedEarly,
    };
  }

  const pullRequest = await adapter.applyChanges(allChanges, {
    title: `Make ${audit.host} readable to AI agents (ReadScore ${audit.avgScore}/100)`,
    body: buildPrBody(audit, results, totalCostUsd),
  });

  return {
    plan,
    results,
    totalCostUsd,
    creditsConsumed: results.filter((r) => r.strategy === "llm" && r.ok).length,
    pullRequest,
    stoppedEarly,
  };
}

function buildPrBody(audit: AuditResult, results: FixResult[], costUsd: number): string {
  const applied = results.filter((r) => r.ok);
  const skipped = results.filter((r) => !r.ok);

  const lines = [
    `## What this changes`,
    ``,
    `An [AgentRead](https://agentread.tech) audit of **${audit.host}** scored **${audit.avgScore}/100** for AI-agent readability across ${audit.pagesCrawled} pages. This PR fixes what could be fixed automatically.`,
    ``,
    `Nothing here changes what human visitors see — these are all changes to what exists in the server-rendered response.`,
    ``,
    `### Applied`,
    ``,
  ];

  for (const r of applied) {
    const tag = r.strategy === "deterministic" ? "generated" : "code change";
    lines.push(`**${r.title}** _(${tag})_`);
    lines.push(``);
    lines.push(r.explanation);
    lines.push(``);
    for (const c of r.changes) {
      lines.push(`- \`${c.path}\` — ${c.rationale}`);
    }
    lines.push(``);
  }

  if (skipped.length) {
    lines.push(`### Not applied`, ``);
    for (const r of skipped) {
      lines.push(`- **${r.title}** — ${r.error ?? "skipped"}`);
    }
    lines.push(``);
  }

  lines.push(
    `---`,
    ``,
    `Re-run the audit after merging to confirm the score moved. ${
      costUsd > 0 ? `Inference cost for this run: ${formatUsd(costUsd)}.` : "This run used no inference."
    }`,
    ``,
    `🤖 Opened by AgentRead Autofix`
  );

  return lines.join("\n");
}
