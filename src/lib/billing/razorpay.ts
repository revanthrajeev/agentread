import crypto from "node:crypto";
import type { PlanId } from "./plans";
import type { CurrencyCode } from "./currency";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  ProviderSubscription,
} from "./provider";

/**
 * Razorpay — Subscriptions API.
 *
 * This is the gateway that makes the company bankable from India: it settles into an Indian
 * current account, it can charge INR/UPI/netbanking domestically, and its international
 * mode settles foreign-currency card payments (USD/EUR/GBP/AED/SGD) with the export paperwork
 * — FIRA/eFIRC — generated automatically, which is the part an Indian exporter actually needs
 * at audit time.
 *
 * Two operational caveats worth knowing before relying on it:
 *   - International acceptance is not on by default. It is a separate activation on the
 *     Razorpay account, approved per business, and can be declined.
 *   - Razorpay bills in the smallest currency unit (paise for INR, cents for USD), so every
 *     amount crossing this boundary is an integer of minor units.
 */

const BASE = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Env-configured plan id, e.g. RAZORPAY_PLAN_PRO_INR. Plans are per-currency in Razorpay. */
export function razorpayPlanId(plan: PlanId, currency: CurrencyCode): string | null {
  return process.env[`RAZORPAY_PLAN_${plan.toUpperCase()}_${currency}`] ?? null;
}

export function planForRazorpayPlanId(planId: string | null | undefined): PlanId | null {
  if (!planId) return null;
  for (const plan of ["pro", "scale", "autofix"] as PlanId[]) {
    for (const currency of ["INR", "USD"] as CurrencyCode[]) {
      if (razorpayPlanId(plan, currency) === planId) return plan;
    }
  }
  return null;
}

function authHeader(): string {
  if (!isRazorpayConfigured()) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.");
  }
  const basic = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");
  return `Basic ${basic}`;
}

async function razorpayFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(
      `Razorpay ${init.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`
    );
  }
  return (await res.json()) as T;
}

interface RazorpaySubscription {
  id: string;
  status: string;
  plan_id?: string;
  short_url?: string;
  current_end?: number | null;
  notes?: Record<string, string>;
}

/**
 * Monthly plan billed for ~10 years. Razorpay requires a finite cycle count on every
 * subscription — there is no "until cancelled" — so this is the standing convention for an
 * open-ended plan. Customers cancel long before it matters, and a lapsed count would simply
 * stop billing rather than overcharge.
 */
const TOTAL_CYCLES = 120;

export const razorpayProvider: PaymentProvider = {
  id: "razorpay",
  label: "Razorpay",
  blurb: "UPI, Indian cards, netbanking and wallets. Billed in ₹ for Indian customers.",

  isConfigured: isRazorpayConfigured,

  // INR is Razorpay's home currency; USD works only once international acceptance is live on
  // the account, which is why a USD plan id has to be configured explicitly to enable it.
  supportsCurrency: () => true,

  supportsPlan(plan, currency) {
    return !!razorpayPlanId(plan, currency);
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const planId = razorpayPlanId(req.plan, req.currency);
    if (!planId) {
      throw new Error(`No Razorpay plan configured for ${req.plan}/${req.currency}.`);
    }

    const subscription = await razorpayFetch<RazorpaySubscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        total_count: TOTAL_CYCLES,
        // Razorpay emails the customer about authorisation and renewals. Suppressing it would
        // mean a failed mandate goes unnoticed until the plan silently lapses.
        customer_notify: 1,
        // Notes are echoed on every subscription webhook — this is how the grant path knows
        // which AgentRead user a Razorpay subscription belongs to.
        notes: {
          supabase_user_id: req.userId,
          plan: req.plan,
          currency: req.currency,
        },
      }),
    });

    if (!subscription.short_url) {
      throw new Error("Razorpay did not return a checkout URL.");
    }

    return { provider: "razorpay", url: subscription.short_url, reference: subscription.id };
  },

  async cancelSubscription(subscriptionId: string) {
    await razorpayFetch(`/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      // Cancel at the end of the paid cycle, not immediately — the customer paid for the
      // remainder of the period and should keep it.
      body: JSON.stringify({ cancel_at_cycle_end: 1 }),
    });
  },

  async getSubscription(subscriptionId: string): Promise<ProviderSubscription | null> {
    try {
      const sub = await razorpayFetch<RazorpaySubscription>(`/subscriptions/${subscriptionId}`);
      return {
        id: sub.id,
        status: sub.status,
        plan: planForRazorpayPlanId(sub.plan_id),
        currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
      };
    } catch {
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

/**
 * Verifies `x-razorpay-signature`: hex HMAC-SHA256 of the *raw* body, keyed with the webhook
 * secret. Parsing the body first and re-serialising it would change the bytes and break this,
 * which is why the route hands us the untouched string.
 *
 * The comparison is timing-safe. A plain `===` leaks, through response timing, how much of a
 * guessed signature was correct — enough to forge one byte at a time.
 */
export function verifyRazorpaySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself be a disclosure; a wrong
  // length is simply a wrong signature.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Razorpay subscription states that mean "this user is paid right now".
 *
 * `authenticated` is deliberately excluded: the mandate exists but the first payment has not
 * been captured, so treating it as active would hand out a paid plan before any money moved.
 */
const ACTIVE_STATES = new Set(["active", "charged"]);

export function isRazorpayStatusActive(status: string | null | undefined): boolean {
  return !!status && ACTIVE_STATES.has(status.toLowerCase());
}
