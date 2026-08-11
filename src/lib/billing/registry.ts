import type { PlanId } from "./plans";
import type { CurrencyCode } from "./currency";
import type { PaymentProvider, ProviderId, ProviderOption } from "./provider";
import { PROVIDER_IDS } from "./provider";
import { stripeProvider } from "./stripe";
import { paypalProvider } from "./paypal";
import { razorpayProvider } from "./razorpay";

/**
 * The provider registry — the single place that knows which gateways exist.
 *
 * Kept apart from `provider.ts` so the interface can be imported by a gateway module without
 * that module importing its two siblings and pulling the Stripe SDK into every bundle.
 */

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  stripe: stripeProvider,
  paypal: paypalProvider,
  razorpay: razorpayProvider,
};

export function getProvider(id: ProviderId): PaymentProvider {
  return PROVIDERS[id];
}

/** Gateways this deployment actually has keys for. */
export function configuredProviders(): PaymentProvider[] {
  return PROVIDER_IDS.map((id) => PROVIDERS[id]).filter((p) => p.isConfigured());
}

export function isAnyProviderConfigured(): boolean {
  return configuredProviders().length > 0;
}

/**
 * Gateways that can actually sell this plan in this currency right now — configured *and*
 * carrying a price/plan id for the pair. A provider with keys but no configured plan id is
 * worse than no provider at all: the button renders and then fails at the gateway.
 */
export function providersFor(plan: PlanId, currency: CurrencyCode): PaymentProvider[] {
  return configuredProviders().filter(
    (p) => p.supportsCurrency(currency) && p.supportsPlan(plan, currency)
  );
}

/**
 * Picks a default gateway when the customer expressed no preference.
 *
 * INR is Razorpay's home turf and the only one of the three that settles rupees into an
 * Indian account, so it leads there. Otherwise Stripe leads on card conversion, with PayPal
 * as the fallback for buyers who won't enter a card.
 */
export function defaultProviderFor(
  plan: PlanId,
  currency: CurrencyCode
): PaymentProvider | null {
  const available = providersFor(plan, currency);
  if (available.length === 0) return null;

  const order: ProviderId[] =
    currency === "INR"
      ? ["razorpay", "stripe", "paypal"]
      : ["stripe", "paypal", "razorpay"];

  for (const id of order) {
    const match = available.find((p) => p.id === id);
    if (match) return match;
  }
  return available[0];
}

/** Serialisable provider list for client components — contains no secrets. */
export function providerOptions(plan: PlanId, currency: CurrencyCode): ProviderOption[] {
  return providersFor(plan, currency).map((p) => ({
    id: p.id,
    label: p.label,
    blurb: p.blurb,
    currencies: (["USD", "INR"] as CurrencyCode[]).filter(
      (c) => p.supportsCurrency(c) && p.supportsPlan(plan, c)
    ),
  }));
}

/** Currencies that at least one configured gateway can sell this plan in. */
export function currenciesFor(plan: PlanId): CurrencyCode[] {
  return (["USD", "INR"] as CurrencyCode[]).filter((c) => providersFor(plan, c).length > 0);
}
