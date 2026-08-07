"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import { CURRENCIES, formatMoney, priceFor, type CurrencyCode } from "@/lib/billing/currency";

/**
 * The public pricing table, with a currency switch.
 *
 * INR is shown only when a gateway is configured that can actually charge rupees — a price a
 * visitor cannot pay is worse than no price at all.
 */
export default function PricingTable({
  currencies,
  initialCurrency,
}: {
  currencies: CurrencyCode[];
  initialCurrency: CurrencyCode;
}) {
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency);

  return (
    <>
      {currencies.length > 1 && (
        <div className="currency-switch" role="group" aria-label="Currency">
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
        </div>
      )}

      <div className="pricing-grid">
        {Object.values(PLANS).map((plan) => {
          const amount = priceFor(plan.id, currency);
          return (
            <div key={plan.id} className={`price-card${plan.id === "pro" ? " price-featured" : ""}`}>
              {plan.id === "pro" && <div className="price-flag">Most popular</div>}
              <div className="price-name">{plan.name}</div>
              <div className="price-amount">
                {plan.id === "enterprise" || amount === null
                  ? "Custom"
                  : formatMoney(amount, currency)}
                {plan.id !== "enterprise" && amount !== null && <span className="hint">/mo</span>}
              </div>
              <div className="price-desc">{plan.blurb}</div>
              <ul className="price-list">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {plan.id === "enterprise" ? (
                <a className="btn btn-ghost" href="mailto:sales@agentread.dev">
                  Talk to us
                </a>
              ) : plan.id === "free" ? (
                <Link className="btn btn-ghost" href="/login">
                  Start free
                </Link>
              ) : (
                <Link
                  className="btn btn-primary"
                  href={`/dashboard/billing?plan=${plan.id}&currency=${currency}`}
                >
                  Choose {plan.name}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {currency === "INR" && (
        <p className="hint" style={{ textAlign: "center", marginTop: 14 }}>
          Rupee pricing is set for India and billed through Razorpay — UPI, Indian cards,
          netbanking and wallets.
        </p>
      )}
    </>
  );
}
