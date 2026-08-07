import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditResult } from "@/lib/engine/crawl";

/**
 * Persistence for audits. Every write is best-effort in the same spirit as the existing
 * `reads` insert in /api/v1/read: a database hiccup must never discard a crawl the user
 * already waited on. Callers get the audit id back when persistence worked, null otherwise.
 */

export interface StoredAudit {
  id: string;
  shareToken: string | null;
}

export async function saveAudit(
  userId: string | null,
  audit: AuditResult,
  opts: { share?: boolean } = {}
): Promise<StoredAudit | null> {
  try {
    const admin = createAdminClient();

    const { data: row, error } = await admin
      .from("audits")
      .insert({
        user_id: userId,
        root_url: audit.rootUrl,
        host: audit.host,
        status: "complete",
        pages_requested: audit.pagesRequested,
        pages_crawled: audit.pagesCrawled,
        avg_score: audit.avgScore,
        min_score: audit.minScore,
        max_score: audit.maxScore,
        total_html_bytes: audit.totalHtmlBytes,
        total_markdown_bytes: audit.totalMarkdownBytes,
        tokens_before: audit.tokensBefore,
        tokens_after: audit.tokensAfter,
        has_llms_txt: audit.hasLlmsTxt,
        discovery: audit.discovery,
        top_issues: audit.topIssues,
        duration_ms: audit.durationMs,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !row) return null;

    // Page markdown is stored so llms-full.txt can be regenerated later without re-crawling.
    const pageRows = audit.pages.map((p) => ({
      audit_id: row.id,
      user_id: userId,
      url: p.url,
      title: p.title,
      read_score: p.readScore,
      hallucination_risk: p.hallucinationRisk,
      html_bytes: p.htmlBytes,
      markdown_bytes: p.markdownBytes,
      tokens_before: p.tokensBefore,
      tokens_after: p.tokensAfter,
      flags: p.flags,
      markdown: p.markdown.slice(0, 200_000), // guard against a pathological single page
      latency_ms: p.latencyMs,
      ok: p.ok,
      error: p.error ?? null,
    }));

    if (pageRows.length) {
      await admin.from("audit_pages").insert(pageRows);
    }

    let shareToken: string | null = null;
    if (opts.share) {
      shareToken = randomBytes(9).toString("base64url");
      const { error: shareError } = await admin
        .from("audit_shares")
        .insert({ token: shareToken, audit_id: row.id });
      if (shareError) shareToken = null;
    }

    return { id: row.id, shareToken };
  } catch {
    return null;
  }
}

/** Loads a shared audit by public token — used by the unauthenticated report page. */
export async function loadSharedAudit(token: string) {
  try {
    const admin = createAdminClient();

    const { data: share } = await admin
      .from("audit_shares")
      .select("audit_id")
      .eq("token", token)
      .maybeSingle();

    if (!share) return null;

    const { data: audit } = await admin
      .from("audits")
      .select("*")
      .eq("id", share.audit_id)
      .maybeSingle();

    if (!audit) return null;

    const { data: pages } = await admin
      .from("audit_pages")
      .select("url, title, read_score, hallucination_risk, html_bytes, markdown_bytes, flags, ok, error")
      .eq("audit_id", share.audit_id)
      .order("read_score", { ascending: true });

    return { audit, pages: pages ?? [] };
  } catch {
    return null;
  }
}

/** Rehydrates a stored audit into the engine's AuditResult shape (for llms.txt regeneration). */
export async function loadAuditForGeneration(
  auditId: string,
  userId: string
): Promise<AuditResult | null> {
  try {
    const admin = createAdminClient();

    const { data: audit } = await admin
      .from("audits")
      .select("*")
      .eq("id", auditId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!audit) return null;

    const { data: pages } = await admin
      .from("audit_pages")
      .select("*")
      .eq("audit_id", auditId);

    return {
      rootUrl: audit.root_url,
      host: audit.host,
      discovery: audit.discovery ?? "seed",
      pagesRequested: audit.pages_requested,
      pagesCrawled: audit.pages_crawled,
      avgScore: audit.avg_score ?? 0,
      minScore: audit.min_score ?? 0,
      maxScore: audit.max_score ?? 0,
      totalHtmlBytes: Number(audit.total_html_bytes ?? 0),
      totalMarkdownBytes: Number(audit.total_markdown_bytes ?? 0),
      tokensBefore: Number(audit.tokens_before ?? 0),
      tokensAfter: Number(audit.tokens_after ?? 0),
      hasLlmsTxt: !!audit.has_llms_txt,
      topIssues: audit.top_issues ?? [],
      durationMs: audit.duration_ms ?? 0,
      pages: (pages ?? []).map((p) => ({
        url: p.url,
        title: p.title ?? p.url,
        ok: p.ok,
        error: p.error ?? undefined,
        readScore: p.read_score ?? 0,
        hallucinationRisk: p.hallucination_risk ?? "high",
        htmlBytes: p.html_bytes ?? 0,
        markdownBytes: p.markdown_bytes ?? 0,
        tokensBefore: p.tokens_before ?? 0,
        tokensAfter: p.tokens_after ?? 0,
        markdown: p.markdown ?? "",
        flags: p.flags ?? [],
        latencyMs: p.latency_ms ?? 0,
      })),
    };
  } catch {
    return null;
  }
}
