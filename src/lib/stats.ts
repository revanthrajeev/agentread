import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicStats {
  totalReads: number;
  avgReadScore: number | null;
}

const EMPTY_STATS: PublicStats = { totalReads: 0, avgReadScore: null };

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
