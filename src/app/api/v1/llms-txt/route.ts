import { NextResponse } from "next/server";
import { auditSite } from "@/lib/engine/crawl";
import { generateLlmsFullTxt, generateLlmsTxt } from "@/lib/engine/llmstxt";
import { extractBearerToken, verifyApiKey } from "@/lib/auth/apiKey";
import { checkQuota, recordUsage } from "@/lib/billing/usage";
import { loadAuditForGeneration, saveAudit } from "@/lib/audit/store";
import { siteUrl } from "@/lib/billing/stripe";

/**
 * Generates llms.txt / llms-full.txt.
 *
 * Deliberately *not* behind its own feature flag: this is the growth loop. The meter is crawl
 * budget (pages per audit), not the feature itself — a free user can generate a real llms.txt
 * for a small site, and a large site is what requires a paid plan. Gating the file itself
 * would trade the acquisition channel for very little revenue.
 *
 * Two modes:
 *   { audit_id }  — regenerate from a stored audit, no re-crawl, no quota consumed
 *   { url }       — fresh crawl, consumes one audit from quota
 */

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
  const variant = body?.variant === "full" ? "full" : "index";
  const format = body?.format === "text" ? "text" : "json";

  try {
    let audit;
    let auditId: string | null = null;

    if (typeof body?.audit_id === "string") {
      audit = await loadAuditForGeneration(body.audit_id, auth.userId);
      if (!audit) {
        return NextResponse.json({ error: "Audit not found." }, { status: 404 });
      }
      auditId = body.audit_id;
    } else if (typeof body?.url === "string") {
      const quota = await checkQuota(auth.userId, "audits");
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: quota.reason,
            code: "quota_exceeded",
            plan: quota.plan.id,
            upgrade_url: `${siteUrl()}/pricing`,
          },
          { status: 402 }
        );
      }

      const requested = Number.isFinite(body?.pages) ? Number(body.pages) : 20;
      const pages = Math.max(1, Math.min(requested, quota.plan.limits.pagesPerAudit));

      audit = await auditSite(body.url, { pages });
      const stored = await saveAudit(auth.userId, audit, { share: false });
      auditId = stored?.id ?? null;
      await recordUsage(auth.userId, { audits: 1, pages: audit.pagesCrawled });
    } else {
      return NextResponse.json(
        { error: "Provide either `url` (fresh crawl) or `audit_id` (regenerate)." },
        { status: 400 }
      );
    }

    const options = {
      siteName: typeof body?.site_name === "string" ? body.site_name : undefined,
      summary: typeof body?.summary === "string" ? body.summary : undefined,
      minScore: Number.isFinite(body?.min_score) ? Number(body.min_score) : undefined,
    };

    const content =
      variant === "full" ? generateLlmsFullTxt(audit, options) : generateLlmsTxt(audit, options);

    if (format === "text") {
      return new NextResponse(content, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-disposition": `inline; filename="${variant === "full" ? "llms-full.txt" : "llms.txt"}"`,
        },
      });
    }

    return NextResponse.json({
      audit_id: auditId,
      variant,
      host: audit.host,
      pages_included: audit.pages.filter((p) => p.ok).length,
      bytes: Buffer.byteLength(content, "utf8"),
      content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate llms.txt";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
