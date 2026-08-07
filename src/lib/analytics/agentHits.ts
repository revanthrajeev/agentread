import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Agent-traffic analytics.
 *
 * This is the dataset the AI-visibility suites can't produce from the outside: not an estimate
 * of how often a model *might* cite you, but a server-side log of which crawler actually
 * fetched which path, what it scored, and how many tokens the distilled version saved.
 * Recording happens in the Serve path, so it's a by-product of the fix rather than extra work.
 */

export interface AgentHitInput {
  userId: string | null;
  host: string;
  path: string;
  crawler: string;
  userAgent?: string | null;
  readScore?: number | null;
  markdownBytes?: number | null;
  tokensSaved?: number | null;
  served?: boolean;
}

export async function recordAgentHit(hit: AgentHitInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("agent_hits").insert({
      user_id: hit.userId,
      host: hit.host,
      path: hit.path.slice(0, 500),
      crawler: hit.crawler,
      user_agent: hit.userAgent ?? null,
      read_score: hit.readScore ?? null,
      markdown_bytes: hit.markdownBytes ?? null,
      tokens_saved: hit.tokensSaved ?? null,
      served: hit.served ?? true,
    });
  } catch {
    // Analytics must never be the reason a crawler doesn't get its page.
  }
}

export interface AgentTrafficSummary {
  totalHits: number;
  byCrawler: Array<{ crawler: string; hits: number }>;
  topPaths: Array<{ path: string; hits: number }>;
  tokensSaved: number;
  avgReadScore: number | null;
  /** Hits per day, oldest first — drives the dashboard chart. */
  daily: Array<{ date: string; hits: number }>;
}

export async function getAgentTraffic(
  userId: string,
  days = 30
): Promise<AgentTrafficSummary> {
  const empty: AgentTrafficSummary = {
    totalHits: 0,
    byCrawler: [],
    topPaths: [],
    tokensSaved: 0,
    avgReadScore: null,
    daily: [],
  };

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await admin
      .from("agent_hits")
      .select("crawler, path, tokens_saved, read_score, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (!data || data.length === 0) return empty;

    const byCrawler = new Map<string, number>();
    const byPath = new Map<string, number>();
    const byDay = new Map<string, number>();
    let tokensSaved = 0;
    let scoreSum = 0;
    let scoreCount = 0;

    for (const row of data) {
      byCrawler.set(row.crawler, (byCrawler.get(row.crawler) ?? 0) + 1);
      byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);
      const day = String(row.created_at).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      tokensSaved += row.tokens_saved ?? 0;
      if (typeof row.read_score === "number") {
        scoreSum += row.read_score;
        scoreCount += 1;
      }
    }

    return {
      totalHits: data.length,
      byCrawler: [...byCrawler.entries()]
        .map(([crawler, hits]) => ({ crawler, hits }))
        .sort((a, b) => b.hits - a.hits),
      topPaths: [...byPath.entries()]
        .map(([path, hits]) => ({ path, hits }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10),
      tokensSaved,
      avgReadScore: scoreCount ? Math.round(scoreSum / scoreCount) : null,
      daily: [...byDay.entries()].map(([date, hits]) => ({ date, hits })),
    };
  } catch {
    return empty;
  }
}
