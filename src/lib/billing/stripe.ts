import Stripe from "stripe";
import type { PlanId } from "./plans";
import type { CurrencyCode } from "./currency";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  ProviderSubscription,
} from "./provider";
import { siteUrl } from "./provider";

/**
 * Stripe wiring. Every entry point degrades gracefully when keys aren't set: the app is
 * fully usable without billing configured (that's the free tier), and the pricing UI shows
 * an honest "billing not configured" state rather than a checkout button that 500s.
 *
 * Note for an India-based entity: a Stripe *India* account settles in INR and cannot bill in
 * USD, and RBI e-mandate rules make card subscriptions awkward. Billing USD through Stripe
 * needs a non-India entity. That is the whole reason PayPal and Razorpay exist alongside it
 * here — see `provider.ts`.
 */

let cached: Stripe | null = null;

export function isBillingConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set — billing is not configured.");
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pinned rather than floating: an account-level API version bump should never silently
      // change webhook payload shapes underneath a running deployment.
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
    });
  }
  return cached;
}

/**
 * Maps a paid plan to the Stripe Price it bills against.
 *
 * Currency-aware: STRIPE_PRICE_PRO_INR is used when present, falling back to the original
 * currency-less STRIPE_PRICE_PRO so an existing deployment keeps working untouched.
 */
export function priceIdFor(plan: PlanId, currency: CurrencyCode = "USD"): string | null {
  const specific = process.env[`STRIPE_PRICE_${plan.toUpperCase()}_${currency}`];
  if (specific) return specific;
  if (currency !== "USD") return null;

  switch (plan) {
    case "pro":
      return process.env.STRIPE_PRICE_PRO ?? null;
    case "scale":
      return process.env.STRIPE_PRICE_SCALE ?? null;
    case "autofix":
      return process.env.STRIPE_PRICE_AUTOFIX ?? null;
    default:
      return null;
  }
}

/** Reverse lookup used by the webhook to turn a Stripe Price back into a plan id. */
export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const plan of ["pro", "scale", "autofix"] as PlanId[]) {
    for (const currency of ["USD", "INR"] as CurrencyCode[]) {
      if (priceIdFor(plan, currency) === priceId) return plan;
    }
  }
  return null;
}

export { siteUrl };

/** Stripe subscription statuses that mean the customer is currently paid up. */
export function isStripeStatusActive(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: "Card",
  blurb: "Visa, Mastercard, Amex and Apple Pay. Secured by Stripe.",

  isConfigured: isBillingConfigured,
  supportsCurrency: () => true,

  supportsPlan(plan, currency) {
    return !!priceIdFor(plan, currency);
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const priceId = priceIdFor(req.plan, req.currency);
    if (!priceId) {
      throw new Error(`No Stripe price configured for ${req.plan}/${req.currency}.`);
    }

    const stripe = getStripe();
    const customerId = await ensureCustomer(req.userId, req.email);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      allow_promotion_codes: true,
      // Carried through to the webhook, which is the only thing that actually grants the plan.
      subscription_data: {
        metadata: { supabase_user_id: req.userId, plan: req.plan, currency: req.currency },
      },
      metadata: { supabase_user_id: req.userId, plan: req.plan, currency: req.currency },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { provider: "stripe", url: session.url, reference: session.id };
  },

  async cancelSubscription(subscriptionId: string) {
    // At period end, not immediately — the customer paid for the rest of the period.
    await getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  },

  async getSubscription(subscriptionId: string): Promise<ProviderSubscription | null> {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const item = sub.items.data[0];
      return {
        id: sub.id,
        status: sub.status,
        plan: planForPriceId(item?.price?.id),
        currentPeriodEnd: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
      };
    } catch {
      return null;
    }
  },

  async portalUrl(customerId: string, returnUrl: string): Promise<string | null> {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  },
};

/**
 * Reuses the existing Stripe customer so a user upgrading twice doesn't end up with two
 * customers and a split billing history.
 */
async function ensureCustomer(userId: string, email: string | null): Promise<string> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { supabase_user_id: userId },
  });

  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id, provider_customer_id: customer.id })
    .eq("id", userId);

  return customer.id;
}
