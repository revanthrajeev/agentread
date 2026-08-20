import type { Metadata } from "next";
import { headers } from "next/headers";
import PricingTable from "@/components/billing/PricingTable";
import { currenciesFor } from "@/lib/billing/registry";
import {
  countryFromHeaders,
  resolveDisplayCurrency,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from "@/lib/billing/currency";

export const metadata: Metadata = {
  title: "Pricing — AgentRead",
  description:
    "Score your site's AI-agent readability, fix what's broken, and prove it improved. Free to start; Pro from $49/mo.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  // Only offer a currency some configured gateway can actually charge. With no gateway
  // configured at all, still show USD list prices rather than an empty page.
  const sellable = currenciesFor("pro");
  const currencies: CurrencyCode[] = sellable.length > 0 ? sellable : [DEFAULT_CURRENCY];

  const initialCurrency = resolveDisplayCurrency(countryFromHeaders(await headers()), currencies);

  return (
    <main className="container section">
      <div className="section-head">
        <div className="eyebrow">Pricing</div>
        <h1 className="title">Find out what agents actually see</h1>
        <p className="lead">
          Visibility tools tell you that you&rsquo;re missing from AI answers. AgentRead tells you
          <em> why</em>, in the markup, and gives you the fix. Start free — no card.
        </p>
      </div>

      <PricingTable currencies={currencies} initialCurrency={initialCurrency} />

      <section className="section-tight">
        <h2 className="title" style={{ fontSize: 24 }}>
          Questions
        </h2>
        <div className="faq">
          <details className="faq-item">
            <summary>How is this different from an AI-visibility tool?</summary>
            <div className="faq-body">
              Visibility platforms measure outcomes — whether a model mentions your brand. AgentRead
              measures and fixes the cause: whether an agent can parse your page at all. They&rsquo;re
              complementary, but only one of them changes what the crawler receives.
            </div>
          </details>
          <details className="faq-item">
            <summary>How is this different from a scraping API?</summary>
            <div className="faq-body">
              Extraction APIs convert a page to Markdown for <em>your</em> pipeline. AgentRead scores
              your own site for everyone else&rsquo;s agents, tells you which pages fail and why, and
              serves the clean version to crawlers automatically.
            </div>
          </details>
          <details className="faq-item">
            <summary>What counts as a read?</summary>
            <div className="faq-body">
              One URL fetched and scored through the Read API or MCP server. A site audit consumes one
              audit from your monthly allowance regardless of page count; the page cap is set by plan.
            </div>
          </details>
          <details className="faq-item">
            <summary>How can I pay?</summary>
            <div className="faq-body">
              Card (via Stripe), PayPal, or Razorpay — UPI, Indian cards, netbanking and
              wallets. Indian customers can pay in rupees through Razorpay; everyone else is
              billed in US dollars. You can cancel from the dashboard on any of them, and
              cancellation always takes effect at the end of the period you already paid for.
            </div>
          </details>
          <details className="faq-item">
            <summary>Is llms.txt generation really on the free plan?</summary>
            <div className="faq-body">
              Yes. The meter is crawl budget, not the feature — a small site can generate a real
              llms.txt and llms-full.txt for free. Large sites are what need a paid plan.
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
