import { createAdminClient } from "@/lib/supabase/admin";
import { isUnlimited, resolvePlan, type PlanId } from "./plans";
import { toUsd, type CurrencyCode } from "./currency";
import type { ProviderId } from "./provider";

/**
 * The one and only path by which a user becomes paid.
 *
 * Three gateways now send us "this person paid" messages. If each webhook wrote to
 * `profiles` itself, there would be three independent ways to grant a paid plan and three
 * places to get it wrong. Every provider funnels through `applySubscriptionState` instead,
 * so the rules about what makes someone paid — and what takes it away — exist once.
 *
 * Two invariants live here:
 *
 *   1. **Only a verified webhook grants a plan.** Callers must verify the gateway's signature
 *      before calling in. A checkout redirect never grants anything; it can be forged, and it
 *      can simply never arrive if the customer closes the tab after paying.
 *
 *   2. **Every grant is idempotent.** Stripe, PayPal and Razorpay all retry on any non-2xx,
 *      and all three can deliver the same event twice on their own. Credit top-ups are the
 *      dangerous case: a retried renewal must not hand out a second month of Autofix credits.
 */

export interface SubscriptionState {
  provider: ProviderId;
  userId: string;
  /** The plan the subscription is for, or "free" when it has lapsed. */
  plan: PlanId | "free";
  /** Raw gateway status string, stored for support and debugging. */
  status: string;
  /** Whether this status means the customer is currently paid up. */
  active: boolean;
  periodEnd?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  currency?: CurrencyCode | null;
}

/**
 * Claims a webhook event id. Returns true the first time an event is seen and false on every
 * replay, so handlers can make side effects exactly once:
 *
 *     if (!(await claimEvent(...))) return ok();   // already handled
 *
 * The uniqueness is enforced by a primary key in Postgres rather than a read-then-write here,
 * so two concurrent deliveries of the same event cannot both win the check.
 */
export async function claimEvent(
  provider: ProviderId,
  eventId: string,
  eventType: string,
  userId?: string | null
): Promise<boolean> {
  if (!eventId) return true; // Nothing to dedupe on — process it rather than drop it.

  const admin = createAdminClient();
  const { error } = await admin.from("billing_events").insert({
    provider,
    event_id: eventId,
    event_type: eventType,
    user_id: userId ?? null,
  });

  if (!error) return true;

  // 23505 = unique_violation: we have processed this event before.
  if (error.code === "23505") return false;

  // Any other failure (table missing, connection dropped) must not silently swallow a real
  // payment event. Process it and let the operation itself be as safe as it can be.
  console.error("[agentread billing] claimEvent failed, processing anyway:", error);
  return true;
}

/** Mirrors a gateway subscription onto the user's profile. */
export async function applySubscriptionState(state: SubscriptionState): Promise<void> {
  const admin = createAdminClient();

  // Losing an active subscription drops the user to free rather than stranding them on a paid
  // plan they have stopped paying for.
  const plan = state.active ? state.plan : "free";

  const update: Record<string, unknown> = {
    plan,
    plan_status: state.status,
    billing_provider: state.provider,
    plan_period_end: state.periodEnd ?? null,
  };

  if (state.customerId !== undefined) update.provider_customer_id = state.customerId;
  if (state.subscriptionId !== undefined) update.provider_subscription_id = state.subscriptionId;
  if (state.currency) update.billing_currency = state.currency;

  // Stripe's own columns stay in sync so the hosted billing portal keeps working.
  if (state.provider === "stripe") {
    if (state.customerId !== undefined) update.stripe_customer_id = state.customerId;
    if (state.subscriptionId !== undefined) update.stripe_subscription_id = state.subscriptionId;
  }

  const { error } = await admin.from("profiles").update(update).eq("id", state.userId);
  if (error) throw new Error(`Failed to apply subscription state: ${error.message}`);
}

/**
 * Tops the user's Autofix credit allowance up for one paid period.
 *
 * Guarded by `claimEvent` at the call site — this is the operation that must never run twice
 * for one payment, because credits are the thing that costs us real money at the Anthropic API.
 */
export async function grantMonthlyCredits(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  const allowance = resolvePlan(profile?.plan).limits.autofixCredits;
  // Unlimited plans do not meter, so there is nothing to grant.
  if (!allowance || isUnlimited(allowance)) return;

  await admin.rpc("grant_autofix_credits", { p_user_id: userId, p_amount: allowance });
}

export interface PaymentRecord {
  provider: ProviderId;
  providerPaymentId: string;
  userId: string;
  amountMinor: number;
  currency: CurrencyCode;
  plan: PlanId | "free";
  status: string;
}

/**
 * Appends to the unified revenue ledger.
 *
 * Without this, answering "how much did we make last month" means opening three dashboards in
 * three currencies and adding them by hand. The USD column is a reporting convenience at a
 * fixed rate — it is never used to price anything.
 */
export async function recordPayment(payment: PaymentRecord): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    user_id: payment.userId,
    provider: payment.provider,
    provider_payment_id: payment.providerPaymentId,
    amount_minor: payment.amountMinor,
    currency: payment.currency,
    amount_usd: toUsd(payment.amountMinor, payment.currency),
    plan: payment.plan,
    status: payment.status,
  });

  // A duplicate payment id is the ledger's own idempotency working as intended, not an error.
  if (error && error.code !== "23505") {
    console.error("[agentread billing] failed to record payment:", error);
  }
}

/** Finds the AgentRead user behind a gateway-side customer id. */
export async function userIdForCustomer(
  provider: ProviderId,
  customerId: string
): Promise<string | null> {
  const admin = createAdminClient();

  const column = provider === "stripe" ? "stripe_customer_id" : "provider_customer_id";
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq(column, customerId)
    .maybeSingle();

  if (data?.id) return data.id;

  // Stripe rows written before the generic columns existed only have the Stripe-specific one;
  // fall back so an old customer is still resolvable.
  if (provider === "stripe") return null;

  const { data: fallback } = await admin
    .from("profiles")
    .select("id")
    .eq("provider_customer_id", customerId)
    .maybeSingle();
  return fallback?.id ?? null;
}

/** Finds the AgentRead user behind a gateway-side subscription id. */
export async function userIdForSubscription(subscriptionId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();
  return data?.id ?? null;
}
