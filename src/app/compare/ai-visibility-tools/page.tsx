import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "AgentRead vs. AI-visibility monitoring tools",
  description:
    "AI-visibility platforms tell you your brand is missing from ChatGPT/Perplexity answers. AgentRead tells you why — in your site's own markup — and fixes it.",
  alternates: { canonical: "/compare/ai-visibility-tools" },
};

const ROWS: Array<{ label: string; monitoring: string; agentread: string }> = [
  {
    label: "What it measures",
    monitoring: "Whether your brand gets mentioned/cited in AI-generated answers",
    agentread: "Whether an AI agent can technically extract your page's content at all",
  },
  {
    label: "What it does when you're invisible",
    monitoring: "Tells you it happened, with a dashboard and a trend line",
    agentread: "Shows the exact markup issue (client-side pricing, disabled CTA, missing llms.txt) and opens a pull request that fixes it",
  },
  {
    label: "How it works",
    monitoring: "Polls multiple AI engines with sample prompts, on a schedule",
    agentread: "Crawls and scores your own pages directly — a technical audit, not a survey",
  },
  {
    label: "Typical pricing",
    monitoring: "$99–$800+/mo, often enterprise-only above the entry tier",
    agentread: `Free to start, Pro from $${PLANS.pro.priceMonthlyUsd}/mo`,
  },
  {
    label: "Best for",
    monitoring: "Marketing teams tracking brand share-of-voice across AI engines",
    agentread: "Developers and site owners who want the underlying problem actually fixed",
  },
];

export default function CompareAiVisibilityToolsPage() {
  return (
    <main className="container section">
      <div className="section-head">
        <div className="eyebrow">Comparison</div>
        <h1 className="title">AgentRead vs. AI-visibility monitoring tools</h1>
        <p className="lead">
          Platforms like Profound, Semrush AI Visibility, and GEO/AEO monitoring tools answer one
          question: <em>are you showing up in AI answers?</em> That&rsquo;s useful, but it&rsquo;s a
          symptom check — it doesn&rsquo;t tell you why, and it can&rsquo;t fix it. AgentRead audits
          the actual markup an AI agent sees when it fetches your page, and turns what it finds into
          a pull request.
        </p>
      </div>

      <div className="table-wrap" style={{ marginTop: 32 }}>
        <table className="data-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th></th>
              <th>AI-visibility monitoring tools</th>
              <th>AgentRead</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label}>
                <td className="compare-label">{r.label}</td>
                <td>{r.monitoring}</td>
                <td className="compare-agentread">{r.agentread}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="section-tight">
        <h2 className="title" style={{ fontSize: 22 }}>
          They&rsquo;re not actually competitors
        </h2>
        <p className="lead">
          A monitoring tool and AgentRead answer different questions, and a lot of teams
          reasonably use both: monitoring tells you <em>whether</em> you have a visibility problem,
          AgentRead tells you <em>why</em> — in your site&rsquo;s own HTML — and ships the fix as
          a reviewable pull request instead of another chart to interpret.
        </p>
      </section>

      <section className="cta-final">
        <h2 className="title" style={{ fontSize: 28 }}>
          See what&rsquo;s actually broken
        </h2>
        <p className="lead">Free scan, no card. Paste a URL and get a real ReadScore in seconds.</p>
        <div className="hero-cta-row">
          <Link className="btn btn-primary btn-lg" href="/">
            Scan my site
          </Link>
          <Link className="btn btn-ghost btn-lg" href="/pricing">
            See pricing
          </Link>
        </div>
      </section>
    </main>
  );
}
