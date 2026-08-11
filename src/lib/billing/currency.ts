/**
 * Multi-currency pricing.
 *
 * Prices are *set*, not converted. A live FX rate would mean the price on the pricing page
 * changes daily, invoices disagree with what the customer remembers agreeing to, and the
 * INR figure lands on values like ₹2,553. Each currency gets a deliberate price point that
 * only changes when we decide to change it.
 *
 * INR is not a straight conversion of USD — it is set near Indian purchasing power, which is
 * how SaaS is actually priced into India. That means the same plan costs less in INR, so INR
 * checkout is offered through Razorpay (India-facing) rather than to every visitor.
 */

export type CurrencyCode = "USD" | "INR";

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  /** How many minor units make one major unit — cents, paise. */
  minorPerMajor: number;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: "USD", symbol: "$", minorPerMajor: 100, label: "US Dollar" },
  INR: { code: "INR", symbol: "₹", minorPerMajor: 100, label: "Indian Rupee" },
};

/**
 * Per-plan price in each currency, in MAJOR units (dollars, rupees).
 * `null` means the plan is not sold in that currency (free and enterprise aren't sold at all).
 */
const PRICE_TABLE: Record<string, Record<CurrencyCode, number | null>> = {
  free: { USD: 0, INR: 0 },
  pro: { USD: 29, INR: 1_499 },
  scale: { USD: 99, INR: 4_999 },
  autofix: { USD: 299, INR: 14_999 },
  enterprise: { USD: null, INR: null },
};

/** Approximate USD value of one major unit, used only to normalise a revenue ledger. */
const USD_PER_MAJOR: Record<CurrencyCode, number> = {
  USD: 1,
  // Deliberately a rough constant, refreshed when prices are reviewed. It is used for
  // reporting totals across gateways, never to price a checkout.
  INR: 1 / 88,
};

export function priceFor(plan: string, currency: CurrencyCode): number | null {
  return PRICE_TABLE[plan]?.[currency] ?? null;
}

/** Price in minor units — the unit Razorpay and Stripe both bill in. */
export function priceMinorFor(plan: string, currency: CurrencyCode): number | null {
  const major = priceFor(plan, currency);
  if (major === null) return null;
  return Math.round(major * CURRENCIES[currency].minorPerMajor);
}

/** Normalises any amount to USD so revenue across three gateways can be summed. */
export function toUsd(amountMinor: number, currency: CurrencyCode): number {
  const meta = CURRENCIES[currency];
  const major = amountMinor / meta.minorPerMajor;
  return Math.round(major * USD_PER_MAJOR[currency] * 100) / 100;
}

/** `$29` / `₹1,499` — grouped the way each locale expects (INR uses the lakh grouping). */
export function formatMoney(amountMajor: number, currency: CurrencyCode): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMajor);
}

export function isCurrency(value: unknown): value is CurrencyCode {
  return value === "USD" || value === "INR";
}

/**
 * Suggests a currency from the request's country. Netlify, Vercel and Cloudflare all expose
 * the geo country on a header; absent one we fall back to USD rather than guessing.
 * This only ever pre-selects a toggle — the customer's explicit choice always wins.
 */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  return country?.toUpperCase() === "IN" ? "INR" : DEFAULT_CURRENCY;
}

export function countryFromHeaders(headers: Headers): string | null {
  return (
    headers.get("x-nf-client-connection-country") ??
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    null
  );
}
