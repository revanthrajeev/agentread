import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPlanForUser, getUsage } from "@/lib/billing/usage";
import { isUnlimited, PLANS, type PlanId } from "@/lib/billing/plans";
import {
  countryFromHeaders,
  currencyForCountry,
  DEFAULT_CURRENCY,
  isCurrency,
  type CurrencyCode,
} from "@/lib/billing/currency";
import { currenciesFor, getProvider, isAnyProviderConfigured, providerOptions } from "@/lib/billing/registry";
import { isProviderId, type ProviderOption } from "@/lib/billing/provider";
import DashSidebar from "@/components/dash/DashSidebar";
import BillingActions from "@/components/dash/BillingActions";

const UPGRADABLE: PlanId[] = ["pro", "scale", "autofix"];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; currency?: string }>;
}) {
  const supabase = await createClient().catch(() => null);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/dashboard/billing");

  const [plan, usage, { data: profile }, params] = await Promise.all([
    getPlanForUser(user.id),
    getUsage(user.id),
    supabase
      .from("profiles")
      .select(
        "stripe_customer_id, plan_status, plan_period_end, billing_provider, billing_currency, provider_subscription_id, stripe_subscription_id"
      )
      .eq("id", user.id)
      .maybeSingle(),
    searchParams,
  ]);

  // Currencies at least one configured gateway can charge; USD list prices as a fallback.
  const sellable = currenciesFor("pro");
  const currencies: CurrencyCode[] = sellable.length > 0 ? sellable : [DEFAULT_CURRENCY];

  // Precedence: the link the customer arrived on, then what they're already billed in, then
  // their country, then USD.
  const preferred = isCurrency(params.currency)
    ? params.currency
    : isCurrency(profile?.billing_currency)
      ? profile.billing_currency
      : currencyForCountry(countryFromHeaders(await headers()));
  const initialCurrency = currencies.includes(preferred) ? preferred : currencies[0];

  // Flattened for the client component, which cannot call into the registry itself — the
  // registry pulls in gateway SDKs and server-only secrets.
  const providersByCurrency: Record<string, ProviderOption[]> = {};
  for (const p of UPGRADABLE) {
    for (const c of currencies) {
      providersByCurrency[`${p}:${c}`] = providerOptions(p, c);
    }
  }

  const billingProvider = isProviderId(profile?.billing_provider) ? profile.billing_provider : null;
  const subscriptionId = profile?.provider_subscription_id ?? profile?.stripe_subscription_id;

  const meters = [
    { label: "Reads", used: usage.reads, limit: plan.limits.reads },
    { label: "Site audits", used: usage.audits, limit: plan.limits.audits },
  ];

  return (
    <div className="dash-layout">
      <DashSidebar active="billing" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Billing &amp; usage</h1>
            <p className="sub">
              {plan.name} plan · billing period {usage.period}
              {profile?.plan_period_end
                ? ` · renews ${new Date(profile.plan_period_end).toLocaleDateString()}`
                : ""}
            </p>
          </div>
        </div>

        <section className="panel glass" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div>
              <h2>Current plan — {plan.name}</h2>
              <p className="hint">{plan.blurb}</p>
            </div>
            {plan.priceMonthlyUsd > 0 && (
              <span className="price-amount" style={{ fontSize: 22 }}>
                ${plan.priceMonthlyUsd}
                <span className="hint">/mo</span>
              </span>
            )}
          </div>

          <div style={{ display: "grid", gap: 16, marginTop: 8 }}>
            {meters.map((m) => {
              const pct = isUnlimited(m.limit) ? 0 : Math.min(100, Math.round((m.used / m.limit) * 100));
              return (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="stat-label">{m.label}</span>
                    <span className="mono hint">
                      {m.used.toLocaleString()} / {isUnlimited(m.limit) ? "unlimited" : m.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{ width: `${pct}%`, background: pct >= 90 ? "var(--bad, #ef4444)" : undefined }}
                    />
                  </div>
                </div>
              );
            })}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="stat-label">Pages crawled</span>
                <span className="mono hint">{usage.pagesCrawled.toLocaleString()} this period</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <BillingActions
              currentPlan={plan.id}
              hasSubscription={!!subscriptionId}
              billingConfigured={isAnyProviderConfigured()}
              currencies={currencies}
              providersByCurrency={providersByCurrency}
              initialCurrency={initialCurrency}
              initialPlan={
                UPGRADABLE.includes(params.plan as PlanId) ? (params.plan as PlanId) : null
              }
              providerLabel={billingProvider ? getProvider(billingProvider).label : null}
              hasPortal={!!billingProvider && !!getProvider(billingProvider).portalUrl}
            />
          </div>
        </section>

        <section className="panel glass">
          <div className="panel-head">
            <h2>All plans</h2>
          </div>
          <div className="pricing-grid">
            {(Object.values(PLANS)).map((p) => (
              <div key={p.id} className={`price-card${p.id === plan.id ? " price-featured" : ""}`}>
                {p.id === plan.id && <div className="price-flag">Current</div>}
                <div className="price-name">{p.name}</div>
                <div className="price-amount">
                  {p.id === "enterprise" ? "Custom" : p.priceMonthlyUsd === 0 ? "$0" : `$${p.priceMonthlyUsd}`}
                  {p.id !== "enterprise" && <span className="hint">/mo</span>}
                </div>
                <div className="price-desc">{p.blurb}</div>
                <ul className="price-list">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
