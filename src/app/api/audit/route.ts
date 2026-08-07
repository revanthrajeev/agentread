import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditSite } from "@/lib/engine/crawl";
import { checkQuota, recordUsage } from "@/lib/billing/usage";
import { saveAudit } from "@/lib/audit/store";

/**
 * Session-authenticated audit trigger for the dashboard. Same engine and same quota accounting
 * as /api/v1/audit — this one just authenticates with the browser session instead of a bearer
 * key, so the dashboard doesn't have to mint and store an API key to run an audit.
 */

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : null;
  if (!url) {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  const quota = await checkQuota(user.id, "audits");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason, code: "quota_exceeded", plan: quota.plan.id },
      { status: 402 }
    );
  }

  const requested = Number(body?.pages) || 10;
  const pages = Math.max(1, Math.min(requested, quota.plan.limits.pagesPerAudit));

  try {
    const audit = await auditSite(url, { pages });
    const stored = await saveAudit(user.id, audit, { share: true });
    await recordUsage(user.id, { audits: 1, pages: audit.pagesCrawled });

    return NextResponse.json({
      id: stored?.id ?? null,
      share_token: stored?.shareToken ?? null,
      host: audit.host,
      avg_score: audit.avgScore,
      pages_crawled: audit.pagesCrawled,
      discovery: audit.discovery,
      // A null id means the crawl succeeded but persistence didn't — the UI needs to know
      // that rather than redirecting to a detail page that doesn't exist.
      persisted: !!stored?.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to audit site";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
