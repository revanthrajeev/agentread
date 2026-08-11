import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProviderId } from "@/lib/billing/provider";
import { getProvider } from "@/lib/billing/registry";

/**
 * Cancels the signed-in user's subscription on whichever gateway holds it.
 *
 * PayPal and Razorpay have no hosted portal, so without this a customer on either would have
 * to email support to stop paying — the fastest way to earn a chargeback and a bad review.
 *
 * Every gateway here cancels at period end, not immediately: the customer paid for the rest
 * of the period and keeps it. The plan itself is *not* downgraded here — the gateway's
 * cancellation webhook does that when the period actually ends, which keeps the rule that
 * only a verified webhook changes a plan.
 */
export async function POST() {
  // An unconfigured Supabase throws on construction. On the billing path that must not
  // surface as a 500: a customer trying to stop paying and hitting a server error is how
  // chargebacks are made.
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
    .select("billing_provider, provider_subscription_id, stripe_subscription_id, plan")
    .eq("id", user.id)
    .maybeSingle();

  const subscriptionId = profile?.provider_subscription_id ?? profile?.stripe_subscription_id;
  if (!subscriptionId) {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 });
  }

  const providerId = isProviderId(profile?.billing_provider) ? profile.billing_provider : "stripe";
  const provider = getProvider(providerId);

  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: `${provider.label} is not configured on this deployment.` },
      { status: 503 }
    );
  }

  try {
    await provider.cancelSubscription(subscriptionId, "Cancelled from the AgentRead dashboard");

    // Reflect the pending cancellation immediately so the dashboard doesn't look like the
    // click did nothing. The plan stays paid until the gateway confirms the period ended.
    await admin
      .from("profiles")
      .update({ plan_status: "canceling" })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      message: "Subscription will end at the close of your current billing period.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel subscription";
    console.error(`[agentread billing] ${provider.id} cancel failed:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
