import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicStats {
  totalReads: number;
  /** Distinct hostnames seen across scans and audits — "websites", not "pages". */
  sitesScanned: number;
  avgReadScore: number | null;
}

const EMPTY_STATS: PublicStats = { totalReads: 0, sitesScanned: 0, avgReadScore: null };

/**
 * Usage below which the public stats strip is hidden entirely rather than rendered with zeros.
 *
 * A live site advertising "0 reads processed" is worse than showing nothing: it converts a
 * neutral absence into published evidence that nobody uses the product. Once real traffic
 * crosses the threshold the strip appears on its own, with no deploy.
 *
 * Override with the MIN_DISPLAY_STATS env var; 0 forces the strip to always show.
 */
export const MIN_DISPLAY_STATS: number = resolveThreshold();

function resolveThreshold(): number {
  const raw = process.env.MIN_DISPLAY_STATS;
  if (raw === undefined || raw.trim() === "") return 25;
  const parsed = Number.parseInt(raw, 10);
  // A malformed value falls back to the default rather than accidentally publishing zeros,
  // but an explicit 0 is honoured.
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 25;
}

/** Whether there is enough real usage for the public stats strip to be worth showing. */
export function shouldShowPublicStats(stats: PublicStats): boolean {
  return stats.totalReads >= MIN_DISPLAY_STATS;
}

/**
 * Real aggregate numbers for the public landing page — never fabricated. Uses the service-role
 * client because this is a cross-user aggregate (RLS on `reads` scopes normal clients to their
 * own rows only). Returns zeros/nulls (rendered as an honest "just launched" state) if the
 * Supabase project isn't connected yet or the query fails for any reason.
 */
export async function getPublicStats(): Promise<PublicStats> {
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("reads").select("*", { count: "exact", head: true });

    // One bounded sample serves both the average and the distinct-host count — `url` is
    // selected alongside `read_score` rather than in a second round trip. If this table grows
    // past ~10k rows, replace with a Postgres view/RPC computing both server-side.
    const { data } = await admin.from("reads").select("read_score, url").limit(10000);
    const rows = data ?? [];

    const scores = rows
      .map((r) => r.read_score)
      .filter((s): s is number => typeof s === "number");
    const avgReadScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const hosts = new Set<string>();
    for (const r of rows) addHost(hosts, r.url);

    // Audits are whole-site crawls and carry their own host column; a site audited but never
    // single-page scanned would otherwise be missing from a "websites scanned" figure.
    const { data: auditRows } = await admin.from("audits").select("host").limit(10000);
    for (const a of auditRows ?? []) addHost(hosts, a.host);

    return { totalReads: count ?? 0, sitesScanned: hosts.size, avgReadScore };
  } catch {
    return EMPTY_STATS;
  }
}

/**
 * Normalises a URL or bare hostname into a comparable host, so example.com,
 * www.example.com and https://example.com/pricing all count as one website.
 *
 * Silently ignores anything unparseable: a malformed row should cost one increment, never
 * throw inside the landing page's data fetch. Because the sample above is bounded, this count
 * can only ever *under*-report at very high volume — which is the safe direction for a number
 * published on a marketing page.
 */
function addHost(into: Set<string>, value: unknown): void {
  if (typeof value !== "string" || !value.trim()) return;
  try {
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const host = new URL(withScheme).hostname.replace(/^www\./i, "").toLowerCase();
    if (host) into.add(host);
  } catch {
    // not a URL and not a hostname — skip it
  }
}

/**
 * Records one row for a scan run through the public, unauthenticated ReadScan tool.
 *
 * Uses the service-role client because `reads` is RLS-scoped to `auth.uid() = user_id` and
 * these rows have no user — an anonymous visitor has no session to satisfy that policy.
 *
 * Deliberately swallows every error. This is called with `void` from the scan route: a
 * Supabase outage must cost a counter increment, never the score the visitor asked for.
 * No IP or identifying data is stored — only the public URL the visitor submitted.
 */
export async function recordPublicScan(result: {
  url: string;
  readScore: number;
  hallucinationRisk: string;
  htmlBytes: number;
  markdownBytes: number;
  tokensBefore: number;
  tokensAfter: number;
  latencyMs: number;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("reads").insert({
      user_id: null,
      url: result.url,
      agent: "readscan",
      html_bytes: result.htmlBytes,
      markdown_bytes: result.markdownBytes,
      tokens_before: result.tokensBefore,
      tokens_after: result.tokensAfter,
      read_score: result.readScore,
      hallucination_risk: result.hallucinationRisk,
      latency_ms: result.latencyMs,
    });
  } catch {
    // analytics only — never surfaced, never retried
  }
}
