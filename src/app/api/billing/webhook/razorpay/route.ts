import { NextResponse } from "next/server";
import {
  isRazorpayConfigured,
  isRazorpayStatusActive,
  planForRazorpayPlanId,
  verifyRazorpaySignature,
} from "@/lib/billing/razorpay";
import {
  applySubscriptionState,
  claimEvent,
  grantMonthlyCredits,
  recordPayment,
  userIdForSubscription,
} from "@/lib/billing/grant";
import { isCurrency } from "@/lib/billing/currency";
import type { PlanId } from "@/lib/billing/plans";

/**
 * Razorpay webhook.
 *
 * Verified with a local HMAC over the raw body — no round trip, unlike PayPal. As with the
 * other two gateways, this handler is the only thing that can put a user on a paid plan.
 */

interface RazorpayEntity {
  id?: string;
  status?: string;
  plan_id?: string;
  current_end?: number | null;
  notes?: Record<string, string>;
  // payment entity
  amount?: number;
  currency?: string;
  subscription_id?: string;
}

interface RazorpayEvent {
  event?: string;
  payload?: {
    subscription?: { entity?: RazorpayEntity };
    payment?: { entity?: RazorpayEntity };
  };
}

export async function POST(request: Request) {
  if (!isRazorpayConfigured() || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  }

  // Raw body: the HMAC is computed over the exact transmitted bytes. Parsing first and
  // re-serialising would change them and every signature would fail.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpaySignature(raw, signature)) {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "Malformed webhook body." }, { status: 400 });
  }

  const eventType = event.event ?? "unknown";
  // Razorpay has no event id in the body; the delivery id header serves the same purpose.
  const eventId =
    request.headers.get("x-razorpay-event-id") ??
    `${eventType}:${event.payload?.subscription?.entity?.id ?? event.payload?.payment?.entity?.id ?? raw.length}`;

  if (!(await claimEvent("razorpay", eventId, eventType))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (eventType) {
      case "subscription.activated":
      case "subscription.updated":
      case "subscription.pending":
      case "subscription.halted":
      case "subscription.cancelled":
      case "subscription.completed":
      case "subscription.paused":
      case "subscription.resumed": {
        await applySubscription(event);
        break;
      }

      case "subscription.charged": {
        // Carries both the subscription and the payment: refresh the plan, then meter it.
        await applySubscription(event);
        await handleCharged(event);
        break;
      }

      default:
        // Acknowledged, not errored — Razorpay retries non-2xx responses.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[agentread billing] razorpay webhook handler failed:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

async function applySubscription(event: RazorpayEvent) {
  const entity = event.payload?.subscription?.entity;
  if (!entity?.id) return;

  // `notes` is set at checkout and echoed on every subscription event; it is the primary link
  // back to the AgentRead account.
  const userId = entity.notes?.supabase_user_id ?? (await userIdForSubscription(entity.id));

  if (!userId) {
    console.error("[agentread billing] no user for razorpay subscription", entity.id);
    return;
  }

  const plan = (planForRazorpayPlanId(entity.plan_id) ?? entity.notes?.plan ?? "free") as
    | PlanId
    | "free";
  const currency = entity.notes?.currency;

  await applySubscriptionState({
    provider: "razorpay",
    userId,
    plan,
    status: entity.status ?? "unknown",
    active: isRazorpayStatusActive(entity.status),
    periodEnd: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null,
    subscriptionId: entity.id,
    currency: isCurrency(currency) ? currency : null,
  });
}

/** A successful recurring charge: top up credits for the period and record the revenue. */
async function handleCharged(event: RazorpayEvent) {
  const payment = event.payload?.payment?.entity;
  const subscription = event.payload?.subscription?.entity;
  if (!payment?.id || !subscription?.id) return;

  const userId =
    subscription.notes?.supabase_user_id ?? (await userIdForSubscription(subscription.id));
  if (!userId) return;

  await grantMonthlyCredits(userId);

  // Razorpay already reports minor units (paise/cents), so no conversion is needed.
  const currency = payment.currency?.toUpperCase();
  if (isCurrency(currency) && typeof payment.amount === "number") {
    await recordPayment({
      provider: "razorpay",
      providerPaymentId: payment.id,
      userId,
      amountMinor: payment.amount,
      currency,
      plan: (planForRazorpayPlanId(subscription.plan_id) ?? subscription.notes?.plan ?? "free") as
        | PlanId
        | "free",
      status: "captured",
    });
  }
}
