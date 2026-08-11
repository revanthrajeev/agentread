import { NextResponse } from "next/server";
import {
  decodeCustomId,
  isPaypalConfigured,
  isPaypalStatusActive,
  paypalProvider,
  planForPaypalPlanId,
  verifyPaypalWebhook,
} from "@/lib/billing/paypal";
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
 * PayPal webhook.
 *
 * Authenticity is confirmed by asking PayPal to verify the transmission signature — the
 * documented mechanism — before anything is written. As with Stripe, the approval redirect
 * grants nothing; this handler is the only thing that can put a user on a paid plan.
 */

interface PaypalEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    plan_id?: string;
    custom_id?: string;
    billing_info?: { next_billing_time?: string };
    // PAYMENT.SALE.COMPLETED shape
    billing_agreement_id?: string;
    amount?: { total?: string; currency?: string };
  };
}

export async function POST(request: Request) {
  if (!isPaypalConfigured() || !process.env.PAYPAL_WEBHOOK_ID) {
    return NextResponse.json({ error: "PayPal is not configured." }, { status: 503 });
  }

  // Raw body: PayPal's verification hashes exactly what was transmitted.
  const raw = await request.text();

  const verified = await verifyPaypalWebhook(request.headers, raw);
  if (!verified) {
    // Also covers the case where PayPal itself was unreachable — refusing to grant a plan on
    // an unverifiable event is the safe direction to fail.
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  let event: PaypalEvent;
  try {
    event = JSON.parse(raw) as PaypalEvent;
  } catch {
    return NextResponse.json({ error: "Malformed webhook body." }, { status: 400 });
  }

  const eventId = event.id ?? "";
  const eventType = event.event_type ?? "unknown";

  if (!(await claimEvent("paypal", eventId, eventType))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        await applySubscription(event);
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        await handleSaleCompleted(event);
        break;
      }

      default:
        // Acknowledged, not errored — PayPal retries non-2xx responses.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[agentread billing] paypal webhook handler failed:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

async function applySubscription(event: PaypalEvent) {
  const resource = event.resource;
  if (!resource?.id) return;

  // custom_id is set at checkout and echoed on every subscription event; it is the primary
  // link back to the AgentRead account. The subscription-id lookup covers events on
  // subscriptions created before that link existed.
  const decoded = decodeCustomId(resource.custom_id);
  const userId = decoded?.userId ?? (await userIdForSubscription(resource.id));

  if (!userId) {
    console.error("[agentread billing] no user for paypal subscription", resource.id);
    return;
  }

  const plan = (planForPaypalPlanId(resource.plan_id) ?? decoded?.plan ?? "free") as PlanId | "free";
  const status = resource.status?.toLowerCase() ?? "unknown";

  await applySubscriptionState({
    provider: "paypal",
    userId,
    plan,
    status,
    active: isPaypalStatusActive(resource.status),
    periodEnd: resource.billing_info?.next_billing_time ?? null,
    subscriptionId: resource.id,
    currency: "USD",
  });
}

/** A completed recurring charge: top up credits for the period and record the revenue. */
async function handleSaleCompleted(event: PaypalEvent) {
  const resource = event.resource;
  const subscriptionId = resource?.billing_agreement_id;
  if (!subscriptionId || !resource?.id) return;

  const userId = await userIdForSubscription(subscriptionId);
  if (!userId) return;

  await grantMonthlyCredits(userId);

  // PayPal reports amounts as a decimal string in major units; the ledger stores minor units.
  const currency = resource.amount?.currency?.toUpperCase();
  const total = Number.parseFloat(resource.amount?.total ?? "0");

  if (isCurrency(currency) && Number.isFinite(total)) {
    const subscription = await paypalProvider.getSubscription(subscriptionId);
    await recordPayment({
      provider: "paypal",
      providerPaymentId: resource.id,
      userId,
      amountMinor: Math.round(total * 100),
      currency,
      plan: subscription?.plan ?? "free",
      status: "completed",
    });
  }
}
