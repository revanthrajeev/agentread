import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isBillingConfigured, isStripeStatusActive, planForPriceId } from "@/lib/billing/stripe";
import {
  applySubscriptionState,
  claimEvent,
  grantMonthlyCredits,
  recordPayment,
  userIdForCustomer,
} from "@/lib/billing/grant";
import { isCurrency } from "@/lib/billing/currency";
import type { PlanId } from "@/lib/billing/plans";

/**
 * Stripe webhook — one of three gateways that can grant a plan, all of which funnel through
 * the shared grant path in `lib/billing/grant.ts`.
 *
 * Checkout success alone never grants a plan (a client-side redirect can be forged or simply
 * never happen); the plan is only written here, after Stripe's signature is verified against
 * the raw request body.
 */

export async function POST(request: Request) {
  if (!isBillingConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  // Must be the raw body — parsing it first would break signature verification.
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  // Stripe retries on any non-2xx and can deliver an event more than once on its own.
  // Claiming the id here makes every side effect below happen exactly once.
  if (!(await claimEvent("stripe", event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await getStripe().subscriptions.retrieve(
            typeof session.subscription === "string" ? session.subscription : session.subscription.id
          );
          await applySubscription(subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(event.data.object);
        break;
      }

      case "invoice.paid": {
        // Each paid billing period tops the plan's Autofix credit allowance back up, and
        // appends to the unified revenue ledger.
        await handleInvoicePaid(event.data.object);
        break;
      }

      default:
        // Unhandled event types are acknowledged, not errored — Stripe retries non-2xx.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[agentread billing] webhook handler failed:", err);
    // 500 so Stripe retries rather than silently dropping a plan change.
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}

/** Mirrors a Stripe subscription onto the user's profile via the shared grant path. */
async function applySubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const userId =
    subscription.metadata?.supabase_user_id ?? (await userIdForCustomer("stripe", customerId));

  if (!userId) {
    console.error("[agentread billing] no user for subscription", subscription.id);
    return;
  }

  const item = subscription.items.data[0];
  const planFromPrice = planForPriceId(item?.price?.id);
  const active = isStripeStatusActive(subscription.status);
  const plan = (planFromPrice ?? subscription.metadata?.plan ?? "free") as PlanId | "free";
  const periodEndUnix = item?.current_period_end;
  const currency = subscription.metadata?.currency;

  await applySubscriptionState({
    provider: "stripe",
    userId,
    plan,
    status: subscription.status,
    active,
    periodEnd: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
    customerId,
    subscriptionId: subscription.id,
    currency: isCurrency(currency) ? currency : null,
  });
}

/** Tops up credits and records revenue for a paid invoice. */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const userId = await userIdForCustomer("stripe", customerId);
  if (!userId) return;

  await grantMonthlyCredits(userId);

  const currency = invoice.currency?.toUpperCase();
  if (invoice.id && isCurrency(currency)) {
    // The price on an invoice line can be expanded to a full Price object or left as an id.
    const price = invoice.lines?.data?.[0]?.pricing?.price_details?.price;
    const priceId = typeof price === "string" ? price : price?.id;

    await recordPayment({
      provider: "stripe",
      providerPaymentId: invoice.id,
      userId,
      amountMinor: invoice.amount_paid ?? 0,
      currency,
      plan: planForPriceId(priceId) ?? "free",
      status: "paid",
    });
  }
}
