import { NextResponse } from "next/server";
import { auditSite } from "@/lib/engine/crawl";
import { extractBearerToken, verifyApiKey } from "@/lib/auth/apiKey";
import { checkQuota, recordUsage } from "@/lib/billing/usage";
import { saveAudit } from "@/lib/audit/store";
import { siteUrl } from "@/lib/billing/stripe";

/**
 * Site Audit — the metered unit of work the paid plans sell.
 *
 * /api/v1/read scores one page; this crawls a whole host and rolls the findings up, which is
 * the question a free single-URL scan can't answer. Quota is checked before the crawl starts
 * (so an over-limit caller doesn't burn a minute of crawl time) and recorded after it lands.
 */

// A large crawl legitimately runs for minutes — the platform default would cut it off.
export const maxDuration = 300;

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Authorization: Bearer sk-ar-..." },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(token);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  const quota = await checkQuota(auth.userId, "audits");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: quota.reason,
        code: "quota_exceeded",
        plan: quota.plan.id,
        limit: quota.limit,
        used: quota.used,
        upgrade_url: `${siteUrl()}/pricing`,
      },
      { status: 402 }
    );
  }

  // The plan caps crawl depth, so a free user asking for 500 pages gets their plan's 10.
  const requested = Number.isFinite(body?.pages) ? Number(body.pages) : 10;
  const pages = Math.max(1, Math.min(requested, quota.plan.limits.pagesPerAudit));

  try {
    const audit = await auditSite(url, { pages });

    const stored = await saveAudit(auth.userId, audit, { share: body?.share !== false });
    await recordUsage(auth.userId, { audits: 1, pages: audit.pagesCrawled });

    return NextResponse.json({
      id: stored?.id ?? null,
      share_url: stored?.shareToken ? `${siteUrl()}/report/${stored.shareToken}` : null,
      root_url: audit.rootUrl,
      host: audit.host,
      discovery: audit.discovery,
      pages_requested: audit.pagesRequested,
      pages_crawled: audit.pagesCrawled,
      avg_score: audit.avgScore,
      min_score: audit.minScore,
      max_score: audit.maxScore,
      has_llms_txt: audit.hasLlmsTxt,
      tokens_before: audit.tokensBefore,
      tokens_after: audit.tokensAfter,
      bytes_before: audit.totalHtmlBytes,
      bytes_after: audit.totalMarkdownBytes,
      top_issues: audit.topIssues,
      duration_ms: audit.durationMs,
      pages: audit.pages.map((p) => ({
        url: p.url,
        title: p.title,
        ok: p.ok,
        error: p.error,
        read_score: p.readScore,
        hallucination_risk: p.hallucinationRisk,
        flags: p.flags,
      })),
      plan: {
        id: quota.plan.id,
        audits_used: (quota.used ?? 0) + 1,
        audits_limit: quota.limit,
        max_pages_per_audit: quota.plan.limits.pagesPerAudit,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to audit site";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
