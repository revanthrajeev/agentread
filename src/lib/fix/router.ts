import type { AuditResult, IssueRollup } from "@/lib/engine/crawl";
import { estimateFixCostUsd } from "./pricing";
import type { FixPlan, FixPlanItem, FixStrategy } from "./types";

/**
 * The routing table. This is the single most important file for unit economics:
 * every issue routed to `deterministic` is a fix delivered at zero inference cost,
 * and every issue routed to `advisory` is inference we never spend on a change we
 * couldn't safely make anyway.
 *
 * Routing is by issue *kind*, matched against the flag text the scoring engine
 * produces in src/lib/engine/read.ts. Adding a deduction there means adding a row here.
 */

interface Route {
  issueKey: string;
  strategy: FixStrategy;
  title: string;
  description: string;
  /** Matches the flag text emitted by the scoring engine. */
  match: RegExp;
  /** Input tokens an LLM fix for this issue typically needs (0 when deterministic). */
  tokenEstimate: number;
}

const ROUTES: Route[] = [
  {
    issueKey: "missing_llms_txt",
    strategy: "deterministic",
    title: "Add llms.txt and llms-full.txt",
    description:
      "Generate the machine-readable index agents look for, from pages this audit already crawled.",
    match: /no \/llms\.txt found/i,
    tokenEstimate: 0,
  },
  {
    issueKey: "missing_ai_crawler_rules",
    strategy: "deterministic",
    title: "Allow AI crawlers in robots.txt",
    description:
      "Add explicit GPTBot / ClaudeBot / PerplexityBot rules so agents know they may read the site.",
    // Synthesised by the planner rather than emitted by the scorer — see planFixes().
    match: /^__synthetic_robots__$/,
    tokenEstimate: 0,
  },
  {
    issueKey: "missing_serve_middleware",
    strategy: "deterministic",
    title: "Install the Serve middleware",
    description:
      "Drop in the middleware that serves distilled Markdown to AI crawlers and full HTML to humans.",
    match: /^__synthetic_serve__$/,
    tokenEstimate: 0,
  },
  {
    issueKey: "js_only_content",
    strategy: "llm",
    title: "Render key content server-side",
    description:
      "Price and CTA text exists in the markup but not in the extracted text — it renders client-side only, so agents never see it. This needs a source change.",
    match: /price\/cta keywords found in raw html but not in extracted text/i,
    tokenEstimate: 45_000,
  },
  {
    issueKey: "disabled_cta",
    strategy: "llm",
    title: "Fix CTAs that ship disabled",
    description:
      "A buy/checkout button is disabled in the served markup and only enables after hydration, so agents read it as unavailable.",
    match: /buy\/checkout button appears disabled/i,
    tokenEstimate: 40_000,
  },
  {
    issueKey: "empty_shell",
    strategy: "llm",
    title: "Serve real content in the initial response",
    description:
      "Almost no text could be extracted — the page is an empty shell, a bot-wall, or a paywall to anything that doesn't run JavaScript.",
    match: /very little text content could be extracted/i,
    tokenEstimate: 50_000,
  },
  {
    issueKey: "lazy_content",
    strategy: "llm",
    title: "Eager-load content below the fold",
    description:
      "Lazy-loaded sections never become visible to a reader that doesn't scroll or run JavaScript.",
    match: /lazy-loaded content detected/i,
    tokenEstimate: 30_000,
  },
  {
    issueKey: "script_heavy",
    strategy: "advisory",
    title: "Heavy client-side rendering",
    description:
      "The page ships a large number of scripts. There's no safe automated fix — this is an architecture decision, reported so you can weigh it.",
    match: /<script> tags detected/i,
    tokenEstimate: 0,
  },
  {
    issueKey: "low_reduction",
    strategy: "advisory",
    title: "Low payload reduction",
    description:
      "Little was stripped when distilling the page. Usually benign — the page may already be light.",
    match: /low payload reduction/i,
    tokenEstimate: 0,
  },
];

/** Falls back to advisory: an unrecognised issue is never patched blind. */
function routeFor(text: string): Route | null {
  return ROUTES.find((r) => r.match.test(text)) ?? null;
}

/** Bounded so a 500-page audit doesn't put 500 URLs into a model prompt. */
const MAX_URLS_PER_ITEM = 12;

function urlsForIssue(audit: AuditResult, issueText: string): string[] {
  const normalized = issueText.replace(/^N <script>/, "");
  return audit.pages
    .filter(
      (p) =>
        p.ok &&
        p.flags.some((f) => f.text === issueText || f.text.includes(normalized.slice(0, 40)))
    )
    .slice(0, MAX_URLS_PER_ITEM)
    .map((p) => p.url);
}

/**
 * Turns a completed audit into an ordered plan. High-severity issues first, and within
 * a severity band deterministic fixes first — free wins ship before metered ones.
 */
export function planFixes(auditId: string, audit: AuditResult): FixPlan {
  const items: FixPlanItem[] = [];

  for (const issue of audit.topIssues as IssueRollup[]) {
    const route = routeFor(issue.text);
    if (!route) {
      items.push({
        issueKey: `unknown_${items.length}`,
        strategy: "advisory",
        severity: issue.severity,
        title: "Unclassified finding",
        description: issue.text,
        affectedUrls: [],
        estimatedTokens: 0,
      });
      continue;
    }

    items.push({
      issueKey: route.issueKey,
      strategy: route.strategy,
      severity: issue.severity,
      title: route.title,
      description: route.description,
      affectedUrls: urlsForIssue(audit, issue.text),
      estimatedTokens: route.tokenEstimate,
    });
  }

  // Synthetic deterministic wins that aren't ReadScore deductions but are always
  // worth shipping in the same PR — both are free, so there's no cost argument against.
  for (const key of ["missing_ai_crawler_rules", "missing_serve_middleware"] as const) {
    const route = ROUTES.find((r) => r.issueKey === key)!;
    items.push({
      issueKey: route.issueKey,
      strategy: route.strategy,
      severity: "low",
      title: route.title,
      description: route.description,
      affectedUrls: [],
      estimatedTokens: 0,
    });
  }

  const severityRank = { high: 0, medium: 1, low: 2, ok: 3 } as const;
  const strategyRank = { deterministic: 0, llm: 1, advisory: 2 } as const;

  items.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      strategyRank[a.strategy] - strategyRank[b.strategy]
  );

  const llmItems = items.filter((i) => i.strategy === "llm");

  return {
    auditId,
    host: audit.host,
    items,
    deterministicCount: items.filter((i) => i.strategy === "deterministic").length,
    llmCount: llmItems.length,
    advisoryCount: items.filter((i) => i.strategy === "advisory").length,
    estimatedCostUsd: llmItems.reduce(
      (sum, i) => sum + estimateFixCostUsd(i.estimatedTokens),
      0
    ),
  };
}

/** Exposed for tests and for the pricing page's "what gets fixed automatically" table. */
export function routingTable(): ReadonlyArray<Omit<Route, "match">> {
  return ROUTES.map(({ issueKey, strategy, title, description, tokenEstimate }) => ({
    issueKey,
    strategy,
    title,
    description,
    tokenEstimate,
  }));
}
