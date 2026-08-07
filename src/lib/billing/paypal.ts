import type { PlanId } from "./plans";
import type { CurrencyCode } from "./currency";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  ProviderSubscription,
} from "./provider";

/**
 * PayPal — Subscriptions (Billing) v1.
 *
 * Two things about PayPal drive this file's shape:
 *
 * 1. PayPal India merchants cannot take INR. PayPal shut domestic Indian payments down in
 *    2021; an Indian account is a cross-border export account only. So this provider declares
 *    USD support and refuses INR rather than failing at the gateway with an opaque error.
 *
 * 2. Webhook authenticity is verified by *asking PayPal*, not by checking an HMAC locally.
 *    That costs a network round trip per webhook, but it is the documented mechanism and the
 *    only one that does not require us to fetch and cache PayPal's signing certificates.
 */

const SANDBOX = "https://api-m.sandbox.paypal.com";
const LIVE = "https://api-m.paypal.com";

export function paypalBase(): string {
  // Anything other than an explicit "live" is treated as sandbox: an unset or typo'd env var
  // should route test money to the sandbox, never real money to production.
  return process.env.PAYPAL_ENV?.toLowerCase() === "live" ? LIVE : SANDBOX;
}

export function isPaypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

/** Env-configured plan id, e.g. PAYPAL_PLAN_PRO_USD. Mirrors how Stripe price ids are wired. */
export function paypalPlanId(plan: PlanId, currency: CurrencyCode): string | null {
  return process.env[`PAYPAL_PLAN_${plan.toUpperCase()}_${currency}`] ?? null;
}

export function planForPaypalPlanId(planId: string | null | undefined): PlanId | null {
  if (!planId) return null;
  for (const plan of ["pro", "scale", "autofix"] as PlanId[]) {
    for (const currency of ["USD", "INR"] as CurrencyCode[]) {
      if (paypalPlanId(plan, currency) === planId) return plan;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let tokenCache: { token: string; expiresAt: number } | null = null;

export async function paypalAccessToken(): Promise<string> {
  if (!isPaypalConfigured()) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set.");
  }
  // Re-use until a minute before expiry rather than per request — PayPal tokens last ~9 hours
  // and minting one per webhook would double every webhook's latency.
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const basic = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

/** Test seam — lets the verifier assert token caching without a live PayPal account. */
export function __resetPaypalTokenCache() {
  tokenCache = null;
}

async function paypalFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await paypalAccessToken();
  const res = await fetch(`${paypalBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error(`PayPal ${init.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`);
  }
  // 204s (cancel, activate) have no body to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

interface PaypalLink {
  href: string;
  rel: string;
  method?: string;
}

interface PaypalSubscription {
  id: string;
  status: string;
  plan_id?: string;
  custom_id?: string;
  links?: PaypalLink[];
  billing_info?: { next_billing_time?: string };
}

/**
 * `custom_id` is the only field PayPal reliably echoes back on every subscription webhook,
 * so it carries the two things the grant path needs: who is paying and for what.
 */
export function encodeCustomId(userId: string, plan: PlanId): string {
  return `${userId}:${plan}`;
}

export function decodeCustomId(customId: string | null | undefined): {
  userId: string;
  plan: PlanId | null;
} | null {
  if (!customId) return null;
  const [userId, plan] = customId.split(":");
  if (!userId) return null;
  const known = ["free", "pro", "scale", "autofix", "enterprise"];
  return { userId, plan: plan && known.includes(plan) ? (plan as PlanId) : null };
}

export const paypalProvider: PaymentProvider = {
  id: "paypal",
  label: "PayPal",
  blurb: "Pay with a PayPal balance or card. No card details shared with us.",

  isConfigured: isPaypalConfigured,

  // See the header note: an Indian PayPal merchant account cannot settle INR.
  supportsCurrency: (currency) => currency === "USD",

  supportsPlan(plan, currency) {
    return this.supportsCurrency(currency) && !!paypalPlanId(plan, currency);
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const planId = paypalPlanId(req.plan, req.currency);
    if (!planId) {
      throw new Error(`No PayPal plan configured for ${req.plan}/${req.currency}.`);
    }

    const subscription = await paypalFetch<PaypalSubscription>("/v1/billing/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: planId,
        custom_id: encodeCustomId(req.userId, req.plan),
        subscriber: req.email ? { email_address: req.email } : undefined,
        application_context: {
          brand_name: "AgentRead",
          user_action: "SUBSCRIBE_NOW",
          // A software subscription has nothing to ship; asking for an address would cost
          // conversions and give us personal data we have no reason to hold.
          shipping_preference: "NO_SHIPPING",
          return_url: req.successUrl,
          cancel_url: req.cancelUrl,
        },
      }),
    });

    const approve = subscription.links?.find((l) => l.rel === "approve")?.href;
    if (!approve) {
      throw new Error("PayPal did not return an approval link.");
    }

    return { provider: "paypal", url: approve, reference: subscription.id };
  },

  async cancelSubscription(subscriptionId: string, reason = "Cancelled by customer") {
    await paypalFetch(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async getSubscription(subscriptionId: string): Promise<ProviderSubscription | null> {
    try {
      const sub = await paypalFetch<PaypalSubscription>(
        `/v1/billing/subscriptions/${subscriptionId}`
      );
      return {
        id: sub.id,
        status: sub.status?.toLowerCase() ?? "unknown",
        plan: planForPaypalPlanId(sub.plan_id),
        currentPeriodEnd: sub.billing_info?.next_billing_time ?? null,
      };
    } catch {
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

const SIGNATURE_HEADERS = [
  "paypal-auth-algo",
  "paypal-cert-url",
  "paypal-transmission-id",
  "paypal-transmission-sig",
  "paypal-transmission-time",
] as const;

/**
 * Asks PayPal whether a webhook it supposedly sent is genuine.
 *
 * Returns false — never throws — so the caller can answer 400 on a forged request and 500
 * only on a real fault. A network failure to PayPal is treated as *not verified*: refusing to
 * grant a plan on an unverifiable event is the safe direction to fail.
 */
export async function verifyPaypalWebhook(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId || !isPaypalConfigured()) return false;

  for (const h of SIGNATURE_HEADERS) {
    if (!headers.get(h)) return false;
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return false;
  }

  try {
    const result = await paypalFetch<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: headers.get("paypal-auth-algo"),
          cert_url: headers.get("paypal-cert-url"),
          transmission_id: headers.get("paypal-transmission-id"),
          transmission_sig: headers.get("paypal-transmission-sig"),
          transmission_time: headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: event,
        }),
      }
    );
    return result.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}

/** Maps a PayPal subscription status onto the active/inactive decision the grant path makes. */
export function isPaypalStatusActive(status: string | null | undefined): boolean {
  return status?.toUpperCase() === "ACTIVE";
}
