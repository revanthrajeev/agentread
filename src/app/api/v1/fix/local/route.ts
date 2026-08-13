import { NextResponse } from "next/server";
import { extractBearerToken, verifyApiKey } from "@/lib/auth/apiKey";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAuditForGeneration } from "@/lib/audit/store";
import { runAutofix } from "@/lib/fix/runner";
import { localAdapter } from "@/lib/fix/adapter";
import { planFixes } from "@/lib/fix/router";
import { CREDIT_PRICE_USD } from "@/lib/fix/pricing";
import type { RepoContext } from "@/lib/fix/types";

/**
 * Autofix against a local folder, for the desktop app. Same plan → deterministic → LLM
 * pipeline as /api/fix, but there's no GitHub connection and no PR: the desktop app has
 * already read the relevant files off the user's disk and sends their contents here; this
 * route returns FileChange[] for the app to write straight back to disk. Exists so a user
 * who won't grant GitHub repo access still gets Autofix — the trade they're making is a
 * one-time upload of the specific files touched, not standing repo access.
 *
 * API-key authenticated (Authorization: Bearer sk-ar-...), not session-cookie, since the
 * desktop app has no browser session.
 */

export const maxDuration = 300;

interface LocalFile {
  path: string;
  contents: string;
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Authorization: Bearer sk-ar-..." },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(token);
  if (!auth) return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const auditId = typeof body?.audit_id === "string" ? body.audit_id : null;
  const framework = typeof body?.framework === "string" ? body.framework : "unknown";
  const tree = Array.isArray(body?.tree) ? (body.tree as string[]) : [];
  const keyFiles = Array.isArray(body?.key_files) ? (body.key_files as LocalFile[]) : [];
  const files = Array.isArray(body?.files) ? (body.files as LocalFile[]) : [];
  const dryRun = body?.dry_run === true;

  if (!auditId) {
    return NextResponse.json({ error: "Missing required field: audit_id" }, { status: 400 });
  }

  const audit = await loadAuditForGeneration(auditId, auth.userId);
  if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  const plan = planFixes(auditId, audit);

  if (body?.plan_only === true) {
    return NextResponse.json({ plan, credit_price_usd: CREDIT_PRICE_USD });
  }

  const admin = createAdminClient();

  let reserved = 0;
  if (plan.llmCount > 0 && !dryRun) {
    const { data: remaining } = await admin.rpc("consume_autofix_credits", {
      p_user_id: auth.userId,
      p_amount: plan.llmCount,
    });

    if (remaining === -1 || remaining === null) {
      return NextResponse.json(
        {
          error: `This job needs ${plan.llmCount} Autofix credit${plan.llmCount === 1 ? "" : "s"}. Top up to continue.`,
          code: "insufficient_credits",
          needed: plan.llmCount,
        },
        { status: 402 }
      );
    }
    reserved = plan.llmCount;
  }

  const { data: job } = await admin
    .from("fix_jobs")
    .insert({
      user_id: auth.userId,
      audit_id: auditId,
      connection_id: null,
      host: audit.host,
      status: "running",
      deterministic_count: plan.deterministicCount,
      llm_count: plan.llmCount,
      advisory_count: plan.advisoryCount,
    })
    .select("id")
    .single();

  try {
    const ctx: RepoContext = {
      owner: "local",
      repo: "local",
      defaultBranch: "local",
      tree,
      framework,
      keyFiles,
    };
    const fileMap = new Map(files.map((f) => [f.path, f.contents]));

    const result = await runAutofix(auditId, audit, localAdapter(ctx, fileMap), { dryRun });

    const unused = reserved - result.creditsConsumed;
    if (unused > 0) {
      await admin.rpc("grant_autofix_credits", { p_user_id: auth.userId, p_amount: unused });
    }

    const applied = result.results.filter((r) => r.ok).length;
    const skipped = result.results.filter((r) => !r.ok).length;

    if (job) {
      await admin
        .from("fix_jobs")
        .update({
          status: result.error && applied === 0 ? "failed" : "complete",
          fixes_applied: applied,
          fixes_skipped: skipped,
          cost_usd: result.totalCostUsd,
          credits_consumed: result.creditsConsumed,
          revenue_usd: result.creditsConsumed * CREDIT_PRICE_USD,
          stopped_early: result.stoppedEarly,
          error: result.error ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await admin.from("fix_attempts").insert(
        result.results.map((r) => ({
          job_id: job.id,
          user_id: auth.userId,
          issue_key: r.issueKey,
          strategy: r.strategy,
          title: r.title,
          ok: r.ok,
          files_changed: r.changes.length,
          explanation: r.explanation,
          error: r.error ?? null,
          input_tokens: r.usage?.inputTokens ?? 0,
          output_tokens: r.usage?.outputTokens ?? 0,
          cache_read_tokens: r.usage?.cacheReadInputTokens ?? 0,
          cache_write_tokens: r.usage?.cacheCreationInputTokens ?? 0,
          cost_usd: r.costUsd,
        }))
      );
    }

    // No PR to open — the desktop app writes these to disk itself.
    const changes = result.results.filter((r) => r.ok).flatMap((r) => r.changes);

    return NextResponse.json({
      job_id: job?.id ?? null,
      changes,
      applied,
      skipped,
      credits_consumed: result.creditsConsumed,
      stopped_early: result.stoppedEarly,
      error: result.error,
      results: result.results.map((r) => ({
        issue_key: r.issueKey,
        strategy: r.strategy,
        title: r.title,
        ok: r.ok,
        files_changed: r.changes.length,
        explanation: r.explanation,
        error: r.error,
      })),
    });
  } catch (err) {
    if (job) {
      await admin
        .from("fix_jobs")
        .update({ status: "failed", error: err instanceof Error ? err.message : "Unknown error" })
        .eq("id", job.id);
    }
    if (reserved > 0) {
      await admin.rpc("grant_autofix_credits", { p_user_id: auth.userId, p_amount: reserved });
    }
    const message = err instanceof Error ? err.message : "Local fix failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
