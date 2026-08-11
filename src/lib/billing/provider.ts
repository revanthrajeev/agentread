import type { PlanId } from "./plans";
import type { CurrencyCode } from "./currency";

/**
 * The payment-gateway abstraction.
 *
 * Three gateways exist because one is not enough for an Indian company selling globally:
 * Stripe is the default for card payments worldwide, PayPal covers buyers who will not hand
 * a card to an unknown vendor, and Razorpay is the one that settles cleanly into an Indian
 * bank account and can charge INR/UPI domestically.
 *
 * The point of the interface is that *only* the gateway-specific parts differ. Everything
 * downstream of a payment — which plan a user is on, credits, quota — flows through a single
 * grant path (see `grant.ts`), so adding a gateway can never add a second way to become paid.
 */

export type ProviderId = "stripe" | "paypal" | "razorpay";

export const PROVIDER_IDS: ProviderId[] = ["stripe", "paypal", "razorpay"];

export interface CheckoutRequest {
  userId: string;
  email: string | null;
  plan: PlanId;
  currency: CurrencyCode;
  /** Where to send the customer after approval / cancellation. */
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  provider: ProviderId;
  /** The hosted page the customer is redirected to. */
  url: string;
  /** Gateway-side id for the thing we just created (session or subscription). */
  reference: string;
}

export interface ProviderSubscription {
  id: string;
  status: string;
  plan: PlanId | null;
  currentPeriodEnd: string | null;
}

export interface PaymentProvider {
  id: ProviderId;
  label: string;
  /** Short line shown under the provider in the UI so the choice is informed. */
  blurb: string;
  /** True when this deployment has the keys needed to actually charge someone. */
  isConfigured(): boolean;
  supportsCurrency(currency: CurrencyCode): boolean;
  /** True when a plan has a configured price/plan id in that currency. */
  supportsPlan(plan: PlanId, currency: CurrencyCode): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  cancelSubscription(subscriptionId: string, reason?: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscription | null>;
  /**
   * A hosted self-serve billing portal. Only Stripe has one; PayPal and Razorpay customers
   * manage payment methods on the gateway's own site, so those return null and the UI offers
   * a direct cancel instead of a dead "manage subscription" button.
   */
  portalUrl?(customerId: string, returnUrl: string): Promise<string | null>;
}

/** Everything a UI needs to render a provider choice, with no secrets in it. */
export interface ProviderOption {
  id: ProviderId;
  label: string;
  blurb: string;
  currencies: CurrencyCode[];
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as string[]).includes(value);
}
