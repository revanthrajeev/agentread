import { createAdminClient } from "@/lib/supabase/admin";
import { currentPeriod, isUnlimited, resolvePlan, type Plan } from "./plans";

/**
 * Monthly quota accounting. Counters live in `usage_counters` (one row per user per period)
 * and are incremented through the `increment_usage` Postgres function so two concurrent API
 * calls can't both read the same value and write back the same +1.
 */

export interface UsageSnapshot {
  period: string;
  reads: number;
  audits: number;
  pagesCrawled: number;
}

export interface QuotaCheck {
  allowed: boolean;
  plan: Plan;
  usage: UsageSnapshot;
  /** Human-readable reason, present only when `allowed` is false. */
  reason?: string;
  limit?: number;
  used?: number;
}

const EMPTY: UsageSnapshot = { period: currentPeriod(), reads: 0, audits: 0, pagesCrawled: 0 };

export async function getUsage(userId: string): Promise<UsageSnapshot> {
  const period = currentPeriod();
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("usage_counters")
      .select("period, reads, audits, pages_crawled")
      .eq("user_id", userId)
      .eq("period", period)
      .maybeSingle();

    if (!data) return { ...EMPTY, period };
    return {
      period,
      reads: data.reads ?? 0,
      audits: data.audits ?? 0,
      pagesCrawled: data.pages_crawled ?? 0,
    };
  } catch {
    // If usage can't be read we fail *open* — a metering outage must not take the API down.
    return { ...EMPTY, period };
  }
}

export async function getPlanForUser(userId: string): Promise<Plan> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("plan, plan_status")
      .eq("id", userId)
      .maybeSingle();

    // A past_due/canceled subscription drops back to free limits rather than keeping paid access.
    if (data?.plan_status && !["active", "trialing"].includes(data.plan_status)) {
      return resolvePlan("free");
    }
    return resolvePlan(data?.plan);
  } catch {
    return resolvePlan("free");
  }
}

/** Checks a quota without consuming it. `kind` selects which counter is tested. */
export async function checkQuota(
  userId: string,
  kind: "reads" | "audits"
): Promise<QuotaCheck> {
  const [plan, usage] = await Promise.all([getPlanForUser(userId), getUsage(userId)]);

  const limit = kind === "reads" ? plan.limits.reads : plan.limits.audits;
  const used = kind === "reads" ? usage.reads : usage.audits;

  if (isUnlimited(limit) || used < limit) {
    return { allowed: true, plan, usage, limit, used };
  }

  const noun = kind === "reads" ? "reads" : "site audits";
  return {
    allowed: false,
    plan,
    usage,
    limit,
    used,
    reason:
      plan.id === "free"
        ? `Free plan allows ${limit} ${noun} per month (used ${used}). Upgrade to Pro for more.`
        : `Your ${plan.name} plan allows ${limit} ${noun} per month (used ${used}).`,
  };
}

/** Records consumption. Best-effort: a metering failure never fails the user's request. */
export async function recordUsage(
  userId: string,
  delta: { reads?: number; audits?: number; pages?: number }
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.rpc("increment_usage", {
      p_user_id: userId,
      p_period: currentPeriod(),
      p_reads: delta.reads ?? 0,
      p_audits: delta.audits ?? 0,
      p_pages: delta.pages ?? 0,
    });
  } catch {
    /* metering is best-effort */
  }
}
