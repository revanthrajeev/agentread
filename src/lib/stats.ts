import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicStats {
  totalReads: number;
  avgReadScore: number | null;
}

const EMPTY_STATS: PublicStats = { totalReads: 0, avgReadScore: null };

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

    // Client-side average over a bounded sample — fine at current scale; if this table grows
    // past ~10k rows, replace with a Postgres view/RPC that computes avg(read_score) server-side.
    const { data } = await admin.from("reads").select("read_score").limit(10000);
    const scores = (data ?? [])
      .map((r) => r.read_score)
      .filter((s): s is number => typeof s === "number");
    const avgReadScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    return { totalReads: count ?? 0, avgReadScore };
  } catch {
    return EMPTY_STATS;
  }
}
