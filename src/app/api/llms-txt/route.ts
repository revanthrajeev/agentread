import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { auditSite } from "@/lib/engine/crawl";
import { generateLlmsFullTxt, generateLlmsTxt } from "@/lib/engine/llmstxt";
import { checkQuota, recordUsage } from "@/lib/billing/usage";
import { loadAuditForGeneration, saveAudit } from "@/lib/audit/store";

/**
 * Session-authenticated llms.txt generation for the dashboard (the bearer-auth twin lives at
 * /api/v1/llms-txt). Regenerating from a stored audit re-reads persisted page markdown, so it
 * costs nothing; passing a raw URL runs a fresh crawl and consumes one audit from quota.
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
  const variant = body?.variant === "full" ? "full" : "index";

  try {
    let audit;

    if (typeof body?.audit_id === "string") {
      audit = await loadAuditForGeneration(body.audit_id, user.id);
      if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    } else if (typeof body?.url === "string") {
      const quota = await checkQuota(user.id, "audits");
      if (!quota.allowed) {
        return NextResponse.json(
          { error: quota.reason, code: "quota_exceeded" },
          { status: 402 }
        );
      }
      const pages = Math.max(1, Math.min(Number(body?.pages) || 20, quota.plan.limits.pagesPerAudit));
      audit = await auditSite(body.url, { pages });
      await saveAudit(user.id, audit, { share: false });
      await recordUsage(user.id, { audits: 1, pages: audit.pagesCrawled });
    } else {
      return NextResponse.json(
        { error: "Provide either `url` or `audit_id`." },
        { status: 400 }
      );
    }

    const content = variant === "full" ? generateLlmsFullTxt(audit) : generateLlmsTxt(audit);

    return NextResponse.json({
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
