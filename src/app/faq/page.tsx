import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import { KNOWN_AI_CRAWLERS } from "@/lib/serve/crawlers";

const CRAWLER_COUNT = Object.keys(KNOWN_AI_CRAWLERS).length;

export const metadata: Metadata = {
  title: "FAQ — AgentRead",
  description:
    "How AI search visibility works, what a ReadScore measures, how AgentRead differs from AI-visibility monitoring and SEO tools, and what Autofix actually changes.",
  alternates: { canonical: "/faq" },
};

/**
 * One source for both the rendered page and the FAQPage JSON-LD below.
 *
 * Kept as data rather than JSX for a specific reason: structured data that disagrees with the
 * visible page is worse than none at all — Google treats it as spam, and an assistant quoting
 * the markup would attribute an answer to us that a reader can't find. Deriving both from this
 * array makes that class of drift impossible.
 *
 * Answers are written to be quotable standalone, because that is how they get used: an
 * assistant lifts one answer into a response with no surrounding page for context. Each one
 * therefore repeats enough subject ("AgentRead audits...") to survive being read alone.
 */
interface Faq {
  q: string;
  /** Plain text — this exact string goes into the JSON-LD. */
  a: string;
  /** Optional links rendered under the answer. Not part of the structured data. */
  links?: { label: string; href: string }[];
}

interface FaqSection {
  heading: string;
  items: Faq[];
}

const SECTIONS: FaqSection[] = [
  {
    heading: "What it is",
    items: [
      {
        q: "What is AgentRead?",
        a: "AgentRead is an AI search visibility tool. It audits what AI crawlers and assistants like ChatGPT, Claude, Perplexity and Google's Gemini can actually read on your website, scores every page from 0 to 100, explains which markup is causing the problem, and ships the fix as a pull request you review before merging.",
        links: [{ label: "Run a free scan", href: "/playground" }],
      },
      {
        q: "What is a ReadScore?",
        a: "A ReadScore is a 0-100 measure of how much of a page an AI assistant can actually read. It starts at 100 and deducts for specific, named problems: prices and calls to action that exist in the raw HTML but not in the extracted text, buy buttons that ship disabled, lazy-loaded content, script-heavy pages, and a missing llms.txt file. Every deduction maps to a flag you can act on, so the number is never a black box.",
        links: [{ label: "How the score is computed", href: "/docs" }],
      },
      {
        q: "How is AgentRead different from AI visibility tools like Profound, Peec or Scrunch?",
        a: "AI visibility platforms measure the outcome: whether a model mentions your brand in its answers. AgentRead measures and fixes the cause: whether an assistant can parse your page at all. They are genuinely complementary, but only one of them changes what the crawler receives. If your pages are failing to parse, no amount of monitoring will tell you which line of markup to change.",
      },
      {
        q: "How is AgentRead different from an SEO tool like Semrush or Ahrefs?",
        a: "Traditional SEO tools optimise for how search engines rank a list of links. AgentRead optimises for how AI assistants read and quote a page when they answer a question directly, with no list of links involved. The overlap is real and AgentRead does check standard on-page SEO signals like title tags, meta descriptions, headings, alt text and canonical tags, but the deductions unique to it are about machine readability rather than ranking.",
      },
      {
        q: "How is AgentRead different from a scraping API like Firecrawl?",
        a: "Extraction APIs convert someone else's page into Markdown for your pipeline. AgentRead scores your own site for everyone else's agents, tells you which pages fail and why, and can serve the clean version to crawlers automatically. Firecrawl reads other people's sites; AgentRead fixes yours.",
      },
    ],
  },
  {
    heading: "Why it matters",
    items: [
      {
        q: "Why would an AI assistant describe my website wrong?",
        a: "Because it never saw most of your page. A typical product page ships several hundred kilobytes of JavaScript, CSS and tracking to deliver a few kilobytes of actual words. If your price, specification or call to action renders client-side, an AI crawler that does not execute JavaScript receives markup with no price in it. The model still answers the question, so it fills the gap from somewhere else, and that is where wrong answers about your product come from.",
      },
      {
        q: "What is llms.txt and do I actually need one?",
        a: "llms.txt is a plain-text file at the root of your site that tells AI systems what the site is for and points them at your most important pages, in the same spirit as robots.txt or sitemap.xml. It is not a formal standard and no AI vendor is contractually obliged to read it, but ChatGPT, Claude and Perplexity do fetch it, and it is one of the few places where a few hundred bytes of plain text measurably changes how a model describes you. AgentRead generates both llms.txt and llms-full.txt from a real crawl of your site, on every plan including the free one.",
        links: [{ label: "Free llms.txt generator", href: "/tools/llms-txt-generator" }],
      },
      {
        q: "Should I block AI crawlers instead?",
        a: "That is a real strategic choice and it depends on whether you sell attention or sell products. Publishers monetising page views have a genuine case for blocking. If you sell a product or a service, being absent from AI answers means the assistant recommends a competitor instead, and AgentRead's audit will flag AI crawlers blocked in robots.txt as a problem on that assumption. If blocking is deliberate for your business, ignore that particular flag.",
      },
      {
        q: "Will this help me rank on Google too?",
        a: "Partly, and honestly the overlap is smaller than it sounds. AgentRead checks standard on-page SEO signals such as title tags, meta descriptions, single H1 headings, image alt text, canonical tags and structured data, so fixing those helps conventional search as well. But the core deductions are about machine readability rather than ranking, and AgentRead does not do keyword research, backlink analysis or rank tracking. It is not a replacement for an SEO tool.",
      },
    ],
  },
  {
    heading: "How it works",
    items: [
      {
        q: "Do I have to change my website to use AgentRead?",
        a: "No. Auditing is read-only and requires nothing installed, no account for a single-page scan, and no access to your code. Changes only happen if you choose to install the optional Serve middleware or accept an Autofix pull request, and both are entirely up to you.",
      },
      {
        q: "What does Autofix actually change?",
        a: "Autofix turns audit findings into a single reviewable pull request on a branch. It never pushes to your default branch and never auto-merges. Most findings are fixed deterministically from data AgentRead already holds, such as generating llms.txt, appending AI-crawler rules to robots.txt without overwriting existing ones, and adding the Serve middleware, and those cost nothing. Findings that require reading your source code, such as a price rendered only client-side, are patched by a model and consume one credit.",
      },
      {
        q: "What happens if Autofix cannot safely fix something?",
        a: "It reports the finding as advice rather than patching it blind. Some problems, such as a page shipping a very large number of scripts, are architecture decisions with no safe automated fix, so AgentRead describes the trade-off and leaves the judgement to you. The model handling code fixes can also decline a fix when its confidence is low, and a declined fix refunds the credit.",
      },
      {
        q: "Which AI crawlers does AgentRead recognise?",
        a: `The Serve layer currently recognises ${CRAWLER_COUNT} known AI crawler user-agents, including GPTBot and ChatGPT-User from OpenAI, ClaudeBot from Anthropic, PerplexityBot, GoogleOther and Google-Extended, Meta-ExternalAgent, Amazonbot, DuckAssistBot, Cohere, Mistral and Common Crawl. The list is reviewed against each vendor's published documentation and is neither exhaustive nor permanent. Audits do not depend on that list at all, because they measure what any parser would receive.`,
      },
      {
        q: "How long does an audit take?",
        a: "A single-page scan returns in a few seconds. A full site audit depends on how many pages it crawls, with up to 1,000 pages on the highest plan, and runs four pages at a time. AgentRead discovers pages by following llms.txt first, then your sitemap, then on-page links, so it sees the site the way an AI crawler would rather than in an arbitrary order.",
      },
    ],
  },
  {
    heading: "Plans and billing",
    items: [
      {
        q: "What can I do for free?",
        a: `The free plan includes ${PLANS.free.limits.audits} full site audits per month of up to ${PLANS.free.limits.pagesPerAudit} pages each, ${PLANS.free.limits.reads} single-page reads, the complete ReadScore breakdown with every risk flag, llms.txt and llms-full.txt generation, a public shareable audit report, and deterministic Autofix fixes. Single-page scanning needs no account at all.`,
        links: [{ label: "See all plans", href: "/pricing" }],
      },
      {
        q: "How much does AgentRead cost?",
        a: `Pro is $${PLANS.pro.priceMonthlyUsd} a month, Scale is $${PLANS.scale.priceMonthlyUsd} a month, and Autofix is $${PLANS.autofix.priceMonthlyUsd} a month, with Enterprise priced on request. Prices are set separately per currency rather than converted at checkout, so the pricing page and the invoice always agree.`,
        links: [{ label: "Full plan comparison", href: "/pricing" }],
      },
      {
        q: "Can I pay in Indian rupees?",
        a: "Yes. Billing runs through Stripe, PayPal and Razorpay, and rupee prices are set directly rather than converted from dollars at checkout. Cancellation works from the dashboard on all three gateways.",
      },
      {
        q: "What is an Autofix credit?",
        a: "One credit pays for one fix that requires a model to read your source code. Deterministic fixes, which are the majority, never consume a credit. Credits are reserved before any inference runs and are refunded if the model declines the fix, so a fix you do not receive is a fix you do not pay for.",
      },
      {
        q: "Can I cancel at any time?",
        a: "Yes, from the dashboard, on every payment gateway. There is no minimum term and no cancellation fee. Your plan stays active until the end of the period you have already paid for.",
      },
    ],
  },
  {
    heading: "Access and data",
    items: [
      {
        q: "Do you need write access to my repository?",
        a: "Only if you use Autofix, and only to open a pull request. AgentRead never pushes to your default branch and never merges anything. Push access is verified when you connect the repository so a failure surfaces immediately rather than halfway through a fix. Auditing and scoring need no repository access whatsoever.",
      },
      {
        q: "Do you store my source code?",
        a: "No. Source files are read to generate a patch and are not retained afterwards. Repository access tokens are encrypted with AES-256-GCM before being written to the database, and AgentRead refuses to store a token at all if its encryption key is not configured, rather than silently falling back to storing it in plain text.",
      },
      {
        q: "Do I need to give you access to run a scan?",
        a: "No. A scan fetches your public pages exactly as any AI crawler would. There is nothing to install, no DNS change, no tag to embed and no account required for a single-page scan.",
      },
    ],
  },
];

/** Flattened for the structured data — the same strings the page renders. */
function faqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SECTIONS.flatMap((s) =>
      s.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };
}

export default function FaqPage() {
  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);

  return (
    <main className="container section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd()) }}
      />

      <div className="section-head" style={{ maxWidth: 760, marginInline: "auto" }}>
        <div className="eyebrow">FAQ</div>
        <h1 className="title">Questions, answered properly</h1>
        <p className="lead">
          {total} answers on AI search visibility, what a ReadScore measures, and what AgentRead
          changes. Written to be quoted — including by the assistants this product exists to
          talk to.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="section-tight">
          {/* .faq is max-width 760 + margin-inline auto, so the heading has to sit in the same
              column or it drifts to the far left of a 1180px container. */}
          <h2
            className="title"
            style={{ fontSize: 24, marginBottom: 18, maxWidth: 760, marginInline: "auto" }}
          >
            {section.heading}
          </h2>
          <div className="faq">
            {section.items.map((item) => (
              <details key={item.q} className="faq-item glass">
                <summary>
                  {item.q}
                  <svg className="plus" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </summary>
                <div className="faq-body">
                  <p>{item.a}</p>
                  {item.links && (
                    <p style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {item.links.map((l) => (
                        <Link key={l.href} href={l.href} style={{ textDecoration: "underline" }}>
                          {l.label} →
                        </Link>
                      ))}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section className="section-tight">
        <div className="glass" style={{ padding: 28, borderRadius: "var(--r-lg)", textAlign: "center", maxWidth: 760, marginInline: "auto" }}>
          <h2 className="title" style={{ fontSize: 22 }}>
            Still unsure? Scan a page.
          </h2>
          <p className="lead" style={{ marginTop: 8, marginInline: "auto" }}>
            No account needed, and it takes about a minute. If your score comes back healthy,
            you have lost a minute and learned something.
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/playground" className="btn btn-primary">
              Run a free scan
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
