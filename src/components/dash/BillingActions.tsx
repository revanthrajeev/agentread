"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/billing/plans";
import { CURRENCIES, formatMoney, priceFor, type CurrencyCode } from "@/lib/billing/currency";
import type { ProviderId, ProviderOption } from "@/lib/billing/provider";

/**
 * Upgrade / cancel controls.
 *
 * The customer picks a currency and a gateway; both are sent to /api/billing/checkout, which
 * returns a hosted URL regardless of which gateway handled it. Only gateways that are both
 * configured and priced for the chosen pair are offered — a button that fails at the gateway
 * is worse than no button.
 */

const UPGRADABLE: PlanId[] = ["pro", "scale", "autofix"];

export default function BillingActions({
  currentPlan,
  hasSubscription,
  billingConfigured,
  currencies,
  providersByCurrency,
  initialCurrency,
  initialPlan,
  providerLabel,
  hasPortal,
}: {
  currentPlan: PlanId;
  hasSubscription: boolean;
  billingConfigured: boolean;
  currencies: CurrencyCode[];
  /** Gateways that can sell each plan, keyed `${plan}:${currency}`. */
  providersByCurrency: Record<string, ProviderOption[]>;
  initialCurrency: CurrencyCode;
  initialPlan: PlanId | null;
  providerLabel: string | null;
  hasPortal: boolean;
}) {
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency);
  const [plan, setPlan] = useState<PlanId>(
    initialPlan && UPGRADABLE.includes(initialPlan) ? initialPlan : "pro"
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const providers = providersByCurrency[`${plan}:${currency}`] ?? [];

  async function checkout(provider: ProviderId) {
    setBusy(provider);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, provider, currency }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Could not open the billing portal.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel your subscription at the end of the current billing period?")) {
      return;
    }
    setBusy("cancel");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not cancel the subscription.");
        return;
      }
      setNotice(data.message ?? "Subscription cancelled.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  if (!billingConfigured) {
    return (
      <p className="hint">
        No payment gateway is configured on this deployment. Set Stripe, PayPal or Razorpay keys
        (see <span className="mono">.env.example</span>) to enable checkout.
      </p>
    );
  }

  const amount = priceFor(plan, currency);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {currentPlan !== "enterprise" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="stat-label">Plan</span>
            {UPGRADABLE.map((id) => (
              <button
                key={id}
                type="button"
                className={`currency-chip${id === plan ? " is-active" : ""}`}
                aria-pressed={id === plan}
                onClick={() => setPlan(id)}
              >
                {id === "pro" ? "Pro" : id === "scale" ? "Scale" : "Autofix"}
              </button>
            ))}

            {currencies.length > 1 && (
              <>
                <span className="stat-label" style={{ marginLeft: 8 }}>
                  Currency
                </span>
                {currencies.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`currency-chip${code === currency ? " is-active" : ""}`}
                    aria-pressed={code === currency}
                    onClick={() => setCurrency(code)}
                  >
                    {CURRENCIES[code].symbol} {code}
                  </button>
                ))}
              </>
            )}
          </div>

          {providers.length === 0 ? (
            <p className="hint">
              No gateway is configured to sell {plan} in {currency} on this deployment.
            </p>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {providers.map((p) => (
                <button
                  key={p.id}
                  className={`btn btn-sm ${p.id === providers[0].id ? "btn-primary" : "btn-ghost"}`}
                  disabled={busy !== null}
                  title={p.blurb}
                  onClick={() => checkout(p.id)}
                >
                  {busy === p.id
                    ? "Opening…"
                    : `${p.label} — ${amount !== null ? formatMoney(amount, currency) : ""}/mo`}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {hasSubscription && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {hasPortal && (
            <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={openPortal}>
              {busy === "portal" ? "Opening…" : "Manage subscription"}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={cancel}>
            {busy === "cancel" ? "Cancelling…" : "Cancel subscription"}
          </button>
          {providerLabel && <span className="hint">Billed through {providerLabel}</span>}
        </div>
      )}

      {notice && <span style={{ color: "var(--good, #16a34a)", fontSize: 14 }}>{notice}</span>}
      {error && <span style={{ color: "var(--bad, #ef4444)", fontSize: 14 }}>{error}</span>}
    </div>
  );
}
