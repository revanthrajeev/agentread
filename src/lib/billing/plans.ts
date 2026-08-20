/**
 * Plan definitions and quota limits.
 *
 * Pricing is set against the two markets AgentRead sits between: raw extraction APIs
 * (Firecrawl's Hobby tier is $16/mo, Jina Reader is effectively free) and AI-visibility
 * suites (Profound/Peec, enterprise contracts). Extraction alone can't be sold for much —
 * the diagnosis, the fix, and the proof are what carry the price, so Pro sits just above
 * the extraction tier and far below the visibility suites.
 */

export type PlanId = "free" | "pro" | "scale" | "autofix" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  blurb: string;
  limits: {
    /** Metered single-URL reads per calendar month. */
    reads: number;
    /** Site audits per calendar month. */
    audits: number;
    /** Max pages crawled per audit. */
    pagesPerAudit: number;
    /** Concurrent scheduled monitors. */
    watches: number;
    /** Rate limit on the authenticated Read API. */
    readsPerMinute: number;
    /** Autofix credits granted per month. One credit = one LLM-backed code fix. */
    autofixCredits: number;
  };
  features: string[];
}

const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    blurb: "Score a page, see the problems, fix nothing automatically.",
    limits: { reads: 50, audits: 2, pagesPerAudit: 10, watches: 0, readsPerMinute: 10, autofixCredits: 0 },
    features: [
      "50 reads / month",
      "2 site audits / month, up to 10 pages",
      "Full ReadScore breakdown + risk flags",
      "llms.txt + llms-full.txt generation",
      "Public shareable audit report",
      "Autofix: free (generated) fixes only",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 49,
    blurb: "Audit the whole site, generate llms.txt, and watch for regressions.",
    limits: { reads: 5_000, audits: 50, pagesPerAudit: 100, watches: 5, readsPerMinute: 60, autofixCredits: 0 },
    features: [
      "5,000 reads / month",
      "50 site audits / month, up to 100 pages",
      "5 scheduled monitors with regression alerts",
      "Agent-traffic analytics",
      "Serve middleware + MCP server",
      "Autofix: free fixes; code fixes pay-as-you-go",
    ],
  },
  scale: {
    id: "scale",
    name: "Scale",
    priceMonthlyUsd: 149,
    blurb: "Large sites, webhook alerting, and headroom for agent traffic.",
    limits: { reads: 50_000, audits: 500, pagesPerAudit: 500, watches: 50, readsPerMinute: 240, autofixCredits: 10 },
    features: [
      "50,000 reads / month",
      "500 site audits / month, up to 500 pages",
      "Daily monitoring + webhook alerts",
      "Full agent-traffic analytics history",
      "Priority crawl queue",
      "10 Autofix code-fix credits / month",
    ],
  },
  autofix: {
    id: "autofix",
    name: "Autofix",
    priceMonthlyUsd: 399,
    blurb: "We don't just find what's broken — we open the pull request that fixes it.",
    limits: {
      reads: 100_000,
      audits: 1_000,
      pagesPerAudit: 1_000,
      watches: 100,
      readsPerMinute: 500,
      autofixCredits: 100,
    },
    features: [
      "Everything in Scale",
      "100 Autofix code-fix credits / month",
      "Unlimited generated fixes (llms.txt, robots.txt, Serve)",
      "GitHub pull requests, reviewed by you before merge",
      "Re-audit verification: proof the score moved",
      "Priority support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthlyUsd: 0, // contact sales
    blurb: "SSO, custom SLAs, and unlimited crawl budget.",
    limits: {
      reads: UNLIMITED,
      audits: UNLIMITED,
      pagesPerAudit: 2_000,
      watches: UNLIMITED,
      readsPerMinute: 1_000,
      autofixCredits: UNLIMITED,
    },
    features: [
      "Unlimited reads and audits",
      "SSO / SAML, audit log, RBAC",
      "Custom crawl budgets and SLAs",
      "Dedicated support",
    ],
  },
};

/**
 * Maps whatever is stored on `profiles.plan` to a known plan.
 * Legacy values written before billing existed ('developer', 'read_api', 'sdk_control')
 * all resolve to the free tier rather than silently granting paid limits.
 */
export function resolvePlan(raw: string | null | undefined): Plan {
  if (!raw) return PLANS.free;
  const key = raw.toLowerCase();
  if (key in PLANS) return PLANS[key as PlanId];
  if (key === "enterprise") return PLANS.enterprise;
  return PLANS.free;
}

export function isUnlimited(n: number): boolean {
  return n >= UNLIMITED;
}

/** 'YYYY-MM' in UTC — the key usage counters are bucketed by. */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
