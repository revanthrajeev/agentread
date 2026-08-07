import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, isProviderId } from "@/lib/billing/provider";
import { getProvider } from "@/lib/billing/registry";

/**
 * Opens a hosted self-serve billing portal.
 *
 * Only Stripe has one. PayPal and Razorpay customers manage payment methods on the gateway's
 * own site, so this returns a 409 naming the gateway rather than a dead button — the UI shows
 * a direct cancel for those instead (see /api/billing/cancel).
 */
export async function POST() {
  const supabase = await createClient().catch(() => null);
  if (!supabase) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("billing_provider, provider_customer_id, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const providerId = isProviderId(profile?.billing_provider) ? profile.billing_provider : "stripe";
  const provider = getProvider(providerId);

  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this deployment." },
      { status: 503 }
    );
  }

  if (!provider.portalUrl) {
    return NextResponse.json(
      {
        error: `${provider.label} has no hosted billing portal. Cancel here, or update your payment method in your ${provider.label} account.`,
        canCancel: true,
      },
      { status: 409 }
    );
  }

  const customerId = profile?.stripe_customer_id ?? profile?.provider_customer_id;
  if (!customerId) {
    return NextResponse.json({ error: "No billing account yet — upgrade first." }, { status: 400 });
  }

  try {
    const url = await provider.portalUrl(customerId, `${siteUrl()}/dashboard`);
    if (!url) {
      return NextResponse.json({ error: "Could not open the billing portal." }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
