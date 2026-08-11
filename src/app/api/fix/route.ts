import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { open } from "@/lib/crypto/secrets";
import { loadAuditForGeneration } from "@/lib/audit/store";
import { runAutofix } from "@/lib/fix/runner";
import { planFixes } from "@/lib/fix/router";
import { CREDIT_PRICE_USD } from "@/lib/fix/pricing";

/**
 * Runs Autofix against a stored audit and opens a pull request.
 *
 * Credit accounting is deliberately ordered: credits are reserved *before* any inference
 * runs (so a user can't start ten concurrent jobs on one credit), and unused reservations
 * are refunded afterwards. Deterministic fixes never consume a credit.
 */

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const auditId = typeof body?.audit_id === "string" ? body.audit_id : null;
  const connectionId = typeof body?.connection_id === "string" ? body.connection_id : null;
  const dryRun = body?.dry_run === true;

  if (!auditId) {
    return NextResponse.json({ error: "Missing required field: audit_id" }, { status: 400 });
  }

  const audit = await loadAuditForGeneration(auditId, user.id);
  if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  const plan = planFixes(auditId, audit);

  // A plan-only request costs nothing and needs no repo — used by the UI to show what
  // would happen, and what it would cost, before the user commits a credit.
  if (body?.plan_only === true) {
    return NextResponse.json({ plan, credit_price_usd: CREDIT_PRICE_USD });
  }

  const admin = createAdminClient();

  const { data: connection } = await admin
    .from("github_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const chosen = connectionId
    ? (
        await admin
          .from("github_connections")
          .select("*")
          .eq("id", connectionId)
          .eq("user_id", user.id)
          .maybeSingle()
      ).data
    : connection;

  if (!chosen) {
    return NextResponse.json(
      { error: "No GitHub repository connected. Connect one first.", code: "no_connection" },
      { status: 400 }
    );
  }

  // Reserve credits up front. `consume_autofix_credits` refuses to go negative, so two
  // concurrent jobs cannot both spend the same last credit.
  let reserved = 0;
  if (plan.llmCount > 0 && !dryRun) {
    const { data: remaining } = await admin.rpc("consume_autofix_credits", {
      p_user_id: user.id,
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
      user_id: user.id,
      audit_id: auditId,
      connection_id: chosen.id,
      host: audit.host,
      status: "running",
      deterministic_count: plan.deterministicCount,
      llm_count: plan.llmCount,
      advisory_count: plan.advisoryCount,
    })
    .select("id")
    .single();

  try {
    const token = open({
      ciphertext: chosen.token_ciphertext,
      iv: chosen.token_iv,
      tag: chosen.token_tag,
    });

    const result = await runAutofix(
      auditId,
      audit,
      token,
      { owner: chosen.owner, repo: chosen.repo },
      { dryRun }
    );

    // Refund whatever was reserved but not spent — a fix the model declined to make
    // must not be billed.
    const unused = reserved - result.creditsConsumed;
    if (unused > 0) {
      await admin.rpc("grant_autofix_credits", { p_user_id: user.id, p_amount: unused });
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
          pr_url: result.pullRequest?.url ?? null,
          pr_number: result.pullRequest?.number ?? null,
          branch: result.pullRequest?.branch ?? null,
          stopped_early: result.stoppedEarly,
          error: result.error ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await admin.from("fix_attempts").insert(
        result.results.map((r) => ({
          job_id: job.id,
          user_id: user.id,
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

    await admin
      .from("github_connections")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", chosen.id);

    return NextResponse.json({
      job_id: job?.id ?? null,
      pull_request: result.pullRequest,
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
    // Refund the full reservation — a job that threw produced nothing to bill for.
    if (reserved > 0) {
      await admin.rpc("grant_autofix_credits", { p_user_id: user.id, p_amount: reserved });
    }

    const message = err instanceof Error ? err.message : "Autofix failed";
    if (job) {
      await admin
        .from("fix_jobs")
        .update({ status: "failed", error: message, completed_at: new Date().toISOString() })
        .eq("id", job.id);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
