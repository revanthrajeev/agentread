import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDue, runWatch, type WatchRow } from "@/lib/watch/runner";

/**
 * Cron entry point for scheduled monitoring. Point Vercel Cron (or any scheduler) at this
 * hourly; it picks up whichever watches are due and skips the rest, so the schedule interval
 * doesn't have to match any watch's frequency.
 *
 *   Authorization: Bearer $CRON_SECRET
 */

export const maxDuration = 300;

/** Bounded per-tick so a large account can't run past the platform's function timeout. */
const MAX_PER_RUN = 10;

export async function POST(request: Request) {
  return handle(request);
}

// Vercel Cron issues GET requests; both verbs are accepted so either scheduler works.
export async function GET(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("watches")
      .select("id, user_id, root_url, host, frequency, pages, alert_email, webhook_url, alert_threshold, last_run_at, last_score")
      .eq("active", true)
      .order("last_run_at", { ascending: true, nullsFirst: true })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const due = (data as WatchRow[] | null)?.filter((w) => isDue(w)).slice(0, MAX_PER_RUN) ?? [];

    // Sequential on purpose: each watch is itself a concurrent crawl, and running several at
    // once would multiply outbound load on sites we're supposed to be a good citizen toward.
    const results = [];
    for (const watch of due) {
      results.push(await runWatch(watch));
    }

    return NextResponse.json({
      checked: data?.length ?? 0,
      due: due.length,
      ran: results.length,
      alerts: results.filter((r) => r.alerted).length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
