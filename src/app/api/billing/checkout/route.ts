import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, isProviderId } from "@/lib/billing/provider";
import { defaultProviderFor, getProvider, isAnyProviderConfigured } from "@/lib/billing/registry";
import { countryFromHeaders, currencyForCountry, isCurrency } from "@/lib/billing/currency";
import type { PlanId } from "@/lib/billing/plans";

/**
 * Starts checkout on whichever gateway the customer chose, and returns the hosted URL.
 *
 * The response shape is identical across Stripe, PayPal and Razorpay — `{ url }` — so the
 * client never needs to know which gateway it is talking to.
 */
export async function POST(request: Request) {
  if (!isAnyProviderConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this deployment." },
      { status: 503 }
    );
  }

  const supabase = await createClient().catch(() => null);
  if (!supabase) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const plan = body?.plan as PlanId | undefined;

  if (!plan || plan === "free" || plan === "enterprise") {
    return NextResponse.json({ error: "Choose a paid plan." }, { status: 400 });
  }

  // Explicit choice wins; otherwise fall back to the visitor's country, then USD.
  const currency = isCurrency(body?.currency)
    ? body.currency
    : currencyForCountry(countryFromHeaders(request.headers));

  const provider = isProviderId(body?.provider)
    ? getProvider(body.provider)
    : defaultProviderFor(plan, currency);

  if (!provider) {
    return NextResponse.json(
      { error: `No payment gateway is configured to sell ${plan} in ${currency}.` },
      { status: 400 }
    );
  }

  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: `${provider.label} is not configured on this deployment.` },
      { status: 503 }
    );
  }

  if (!provider.supportsCurrency(currency)) {
    return NextResponse.json(
      { error: `${provider.label} cannot charge in ${currency}.` },
      { status: 400 }
    );
  }

  if (!provider.supportsPlan(plan, currency)) {
    return NextResponse.json(
      { error: `${provider.label} has no ${currency} price configured for the ${plan} plan.` },
      { status: 400 }
    );
  }

  try {
    const session = await provider.createCheckout({
      userId: user.id,
      email: user.email ?? null,
      plan,
      currency,
      successUrl: `${siteUrl()}/dashboard?upgraded=1`,
      cancelUrl: `${siteUrl()}/pricing?canceled=1`,
    });

    // Deliberately does not grant anything. The plan is written only by a signature-verified
    // webhook — a customer who closes the tab after paying must still get their plan, and a
    // forged redirect must not grant one.
    return NextResponse.json({ url: session.url, provider: session.provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start checkout";
    console.error(`[agentread billing] ${provider.id} checkout failed:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
