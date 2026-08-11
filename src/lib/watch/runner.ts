import { createAdminClient } from "@/lib/supabase/admin";
import { auditSite } from "@/lib/engine/crawl";
import { saveAudit } from "@/lib/audit/store";
import { recordUsage } from "@/lib/billing/usage";
import { siteUrl } from "@/lib/billing/stripe";

/**
 * Watch — scheduled re-audits with regression detection.
 *
 * A one-off audit is a consulting deliverable; a watch is a subscription. The value is
 * catching the deploy that quietly made a site unreadable to agents — which is exactly the
 * failure mode nobody notices, because the page still looks fine to a human.
 */

export interface WatchRow {
  id: string;
  user_id: string;
  root_url: string;
  host: string;
  frequency: string;
  pages: number;
  alert_email: string | null;
  webhook_url: string | null;
  alert_threshold: number;
  last_run_at: string | null;
  last_score: number | null;
}

export interface WatchRunResult {
  watchId: string;
  host: string;
  score: number;
  previousScore: number | null;
  delta: number | null;
  alerted: boolean;
  error?: string;
}

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/** A watch is due when it has never run, or its interval has elapsed. */
export function isDue(watch: WatchRow, now = Date.now()): boolean {
  if (!watch.last_run_at) return true;
  const interval = FREQUENCY_MS[watch.frequency] ?? FREQUENCY_MS.weekly;
  return now - new Date(watch.last_run_at).getTime() >= interval;
}

export async function runWatch(watch: WatchRow): Promise<WatchRunResult> {
  const base = { watchId: watch.id, host: watch.host };

  try {
    const audit = await auditSite(watch.root_url, { pages: watch.pages });
    const stored = await saveAudit(watch.user_id, audit, { share: false });
    await recordUsage(watch.user_id, { audits: 1, pages: audit.pagesCrawled });

    const previousScore = watch.last_score;
    const delta = previousScore === null ? null : audit.avgScore - previousScore;

    // Only a *drop* past the threshold alerts. Improvements are recorded, never paged on.
    const shouldAlert = delta !== null && delta <= -watch.alert_threshold;

    const admin = createAdminClient();

    await admin.from("watch_events").insert({
      watch_id: watch.id,
      user_id: watch.user_id,
      audit_id: stored?.id ?? null,
      score: audit.avgScore,
      previous_score: previousScore,
      delta,
      alerted: shouldAlert,
      note: shouldAlert
        ? `ReadScore dropped ${Math.abs(delta!)} points on ${watch.host}`
        : null,
    });

    await admin
      .from("watches")
      .update({
        last_run_at: new Date().toISOString(),
        last_score: audit.avgScore,
        last_audit_id: stored?.id ?? null,
      })
      .eq("id", watch.id);

    if (shouldAlert) {
      await sendAlert(watch, {
        score: audit.avgScore,
        previousScore: previousScore!,
        delta: delta!,
        auditId: stored?.id ?? null,
        topIssues: audit.topIssues.slice(0, 3).map((i) => i.text),
      });
    }

    return { ...base, score: audit.avgScore, previousScore, delta, alerted: shouldAlert };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Watch run failed";

    // Still stamp last_run_at so a permanently-broken watch doesn't retry on every cron tick.
    try {
      const admin = createAdminClient();
      await admin
        .from("watches")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", watch.id);
      await admin.from("watch_events").insert({
        watch_id: watch.id,
        user_id: watch.user_id,
        score: null,
        previous_score: watch.last_score,
        delta: null,
        alerted: false,
        note: `Run failed: ${message}`,
      });
    } catch {
      /* best-effort */
    }

    return { ...base, score: 0, previousScore: watch.last_score, delta: null, alerted: false, error: message };
  }
}

interface AlertPayload {
  score: number;
  previousScore: number;
  delta: number;
  auditId: string | null;
  topIssues: string[];
}

async function sendAlert(watch: WatchRow, payload: AlertPayload): Promise<void> {
  const body = {
    event: "readscore.regression",
    host: watch.host,
    root_url: watch.root_url,
    score: payload.score,
    previous_score: payload.previousScore,
    delta: payload.delta,
    top_issues: payload.topIssues,
    audit_url: payload.auditId ? `${siteUrl()}/dashboard/audits/${payload.auditId}` : null,
    detected_at: new Date().toISOString(),
  };

  if (watch.webhook_url) {
    try {
      await fetch(watch.webhook_url, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "AgentRead-Watch/1.0" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      /* a dead webhook endpoint must not fail the watch run */
    }
  }

  // Email is optional infrastructure: without RESEND_API_KEY the webhook still fires and the
  // regression is still recorded in watch_events and shown on the dashboard.
  if (watch.alert_email && process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.ALERT_FROM_EMAIL ?? "AgentRead <alerts@agentread.tech>",
          to: [watch.alert_email],
          subject: `ReadScore dropped ${Math.abs(payload.delta)} points on ${watch.host}`,
          text: [
            `${watch.host} became less readable to AI agents.`,
            ``,
            `ReadScore: ${payload.previousScore} → ${payload.score} (${payload.delta})`,
            ``,
            payload.topIssues.length ? `Top issues:` : ``,
            ...payload.topIssues.map((i) => `  • ${i}`),
            ``,
            body.audit_url ? `Full report: ${body.audit_url}` : ``,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      /* best-effort */
    }
  }
}
