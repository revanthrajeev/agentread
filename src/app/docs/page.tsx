import CodeTabs from "@/components/site/CodeTabs";

export default function DocsPage() {
  return (
    <div className="container docs-layout">
      <aside className="docs-side">
        <div className="side-group">
          <div className="side-title">Getting started</div>
          <a className="side-link" href="#quickstart">Quickstart</a>
          <a className="side-link" href="#auth">Authentication</a>
          <a className="side-link" href="#mcp">MCP server</a>
        </div>
        <div className="side-group">
          <div className="side-title">Read API · Layer 1</div>
          <a className="side-link" href="#read">POST /api/v1/read</a>
          <a className="side-link" href="#audit">POST /api/v1/audit</a>
          <a className="side-link" href="#audit">POST /api/v1/llms-txt</a>
          <a className="side-link" href="#scan">POST /api/scan (free)</a>
        </div>
        <div className="side-group">
          <div className="side-title">Serve · Layer 2</div>
          <a className="side-link" href="#serve">Next.js middleware</a>
          <a className="side-link" href="#watch">Watch &amp; alerts</a>
          <a className="side-link" href="#autofix">Autofix &amp; GitHub</a>
          <a className="side-link" href="#billing">Billing &amp; payments</a>
        </div>
        <div className="side-group">
          <div className="side-title">Reference</div>
          <a className="side-link" href="#readscore">ReadScore formula</a>
          <a className="side-link" href="#limits">Rate limits</a>
          <a className="side-link" href="#roadmap">Roadmap</a>
        </div>
      </aside>

      <main className="docs-main">
        <section className="doc-section" id="quickstart">
          <h2>
            Quickstart <span className="tag tag-live">Live</span>
          </h2>
          <p>Two commands from zero to your first scored, agent-ready read.</p>
          <h3>1 · Get a key</h3>
          <p>
            Create an account and issue a key in the <a href="/dashboard" style={{ color: "var(--accent-strong)" }}>dashboard</a> —
            the free tier includes 1,000 reads a month, no card required.
          </p>
          <h3>2 · Read a page</h3>
          <pre className="doc-code">
            <span className="t-prompt">$</span> curl <span className="t-flag">-X POST</span> https://agentread.dev/api/v1/read \{"\n"}
            {"  "}
            <span className="t-flag">-H</span> <span className="t-str">&quot;Authorization: Bearer $AGENTREAD_API_KEY&quot;</span> \{"\n"}
            {"  "}
            <span className="t-flag">-H</span> <span className="t-str">&quot;Content-Type: application/json&quot;</span> \{"\n"}
            {"  "}
            <span className="t-flag">-d</span> <span className="t-str">&apos;{"{"}&quot;url&quot;: &quot;https://example.com/pricing&quot;{"}"}&apos;</span>
          </pre>
          <h3>3 · Use the result</h3>
          <pre className="doc-code">
            {`{
  "url": "https://example.com/pricing",
  "title": "Pricing",
  "markdown": "# Pricing\\n\\n…",
  "readScore": 82,
  "hallucinationRisk": "low",
  "flags": [],
  "htmlBytes": 812000,
  "markdownBytes": 8100,
  "tokensBefore": 203114,
  "tokensAfter": 1942,
  "latencyMs": 84,
  "cache": "MISS"
}`}
          </pre>
          <p>
            Feed <code>markdown</code> to your model; branch on <code>hallucinationRisk</code> before
            you let an agent quote a price. These are the real field names the engine returns —
            not a simplified example.
          </p>
        </section>

        <section className="doc-section" id="auth">
          <h2>
            Authentication <span className="tag tag-live">Live</span>
          </h2>
          <p>
            Bearer tokens, issued per account from the dashboard. Keys start with{" "}
            <code>sk-ar-</code>, are sha-256 hashed at rest, and are shown in full exactly once at
            creation.
          </p>
          <pre className="doc-code">Authorization: Bearer sk-ar-…</pre>
          <p>
            <code>/api/v1/read</code> and <code>/api/mcp</code> require this header and 401 without
            it. The free <code>/api/read</code> and <code>/api/scan</code> endpoints (used by this
            site&apos;s own Playground/ReadScan widgets) stay open, IP-rate-limited instead.
          </p>
        </section>

        <section className="doc-section" id="mcp">
          <h2>
            MCP server <span className="tag tag-live">Live</span>
          </h2>
          <p>
            A real remote MCP server (Streamable HTTP) — no local install, no npx package. Add it
            to any MCP-capable client with your API key as the bearer token:
          </p>
          <pre className="doc-code">
            {`{
  "mcpServers": {
    "agentread": {
      "url": "https://agentread.dev/api/mcp",
      "headers": { "Authorization": "Bearer sk-ar-…" }
    }
  }
}`}
          </pre>
          <h3>Exposed tools</h3>
          <table className="param-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Status</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>read_url</td>
                <td>
                  <span className="tag tag-live">Live</span>
                </td>
                <td>URL → clean Markdown + ReadScore + flags</td>
              </tr>
              <tr>
                <td>score_url</td>
                <td>
                  <span className="tag tag-live">Live</span>
                </td>
                <td>URL → ReadScore + flags only, no content</td>
              </tr>
              <tr>
                <td>audit_site</td>
                <td>
                  <span className="tag tag-live">Live</span>
                </td>
                <td>Domain → every page crawled, scored, and rolled up</td>
              </tr>
              <tr>
                <td>generate_llms_txt</td>
                <td>
                  <span className="tag tag-live">Live</span>
                </td>
                <td>Domain → llms.txt or llms-full.txt contents</td>
              </tr>
              <tr>
                <td>extract_data</td>
                <td>
                  <span className="tag tag-soon">Roadmap</span>
                </td>
                <td>URL + schema → typed data</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="doc-section" id="read">
          <h2>
            Read API <span className="tag tag-live">Live</span>
          </h2>
          <div className="endpoint-card glass">
            <div className="endpoint-head">
              <span className="method m-post">POST</span>
              <span className="endpoint-path">/api/v1/read</span>
            </div>
            <p className="endpoint-desc">
              Fetch, extract (Mozilla Readability), and convert a URL to Markdown (Turndown), with
              a ReadScore attached. Requires bearer auth. 60 requests/min per key.
            </p>
            <table className="param-table">
              <thead>
                <tr>
                  <th>Param</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    url<span className="req">required</span>
                  </td>
                  <td>string</td>
                  <td>Page to read.</td>
                </tr>
                <tr>
                  <td>fresh</td>
                  <td>boolean</td>
                  <td>Bypass the 10-minute in-memory cache.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="doc-section" id="audit">
          <h2>
            Audit API <span className="tag tag-live">Live</span>
          </h2>
          <div className="endpoint-card glass">
            <div className="endpoint-head">
              <span className="method m-post">POST</span>
              <span className="endpoint-path">/api/v1/audit</span>
            </div>
            <p className="endpoint-desc">
              Crawl a whole host and score every page. Pages are discovered from{" "}
              <span className="mono">/llms.txt</span> first, then{" "}
              <span className="mono">/sitemap.xml</span> (following one level of sitemap-index
              nesting), then on-page links. Consumes one audit from your monthly allowance; the
              per-audit page cap comes from your plan.
            </p>
            <table className="param-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>url</td>
                  <td>string</td>
                  <td>Required. Root URL of the site to audit.</td>
                </tr>
                <tr>
                  <td>pages</td>
                  <td>number</td>
                  <td>Max pages to crawl. Clamped to your plan&apos;s limit.</td>
                </tr>
                <tr>
                  <td>share</td>
                  <td>boolean</td>
                  <td>
                    Defaults true — returns a public <span className="mono">share_url</span> for the
                    report. Set false to keep it private.
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="endpoint-desc">
              Returns <span className="mono">402</span> with{" "}
              <span className="mono">code: &quot;quota_exceeded&quot;</span> when the monthly audit
              allowance is spent.
            </p>
          </div>

          <div className="endpoint-card glass">
            <div className="endpoint-head">
              <span className="method m-post">POST</span>
              <span className="endpoint-path">/api/v1/llms-txt</span>
            </div>
            <p className="endpoint-desc">
              Generate <span className="mono">llms.txt</span> (curated index) or{" "}
              <span className="mono">llms-full.txt</span> (whole-site Markdown). Pass{" "}
              <span className="mono">url</span> to crawl fresh (consumes one audit), or{" "}
              <span className="mono">audit_id</span> to regenerate from an audit you already ran —
              which re-reads stored page Markdown and costs nothing. Set{" "}
              <span className="mono">format: &quot;text&quot;</span> to get the raw file instead of JSON.
            </p>
          </div>
        </section>

        <section className="doc-section" id="watch">
          <h2>
            Watch &amp; alerts <span className="tag tag-live">Live</span>
          </h2>
          <p>
            A monitor re-audits a site on a schedule and alerts when the average ReadScore drops by
            more than your threshold. Improvements are recorded but never paged on. Alerts POST this
            payload to your webhook:
          </p>
          <pre className="code-pane mono">
{`{
  "event": "readscore.regression",
  "host": "example.com",
  "score": 61,
  "previous_score": 78,
  "delta": -17,
  "top_issues": ["Price/CTA keywords found in raw HTML but not in extracted text …"],
  "audit_url": "https://agentread.dev/dashboard/audits/…",
  "detected_at": "2026-08-05T09:00:00.000Z"
}`}
          </pre>
          <p>
            Monitors are executed by a scheduler calling{" "}
            <span className="mono">/api/cron/watch</span> with{" "}
            <span className="mono">Authorization: Bearer $CRON_SECRET</span>. On Vercel this is wired
            up in <span className="mono">vercel.json</span>.
          </p>
        </section>

        <section className="doc-section" id="autofix">
          <h2>
            Autofix <span className="tag tag-live">Live</span>
          </h2>
          <p>
            Turns audit findings into a pull request. Every finding is routed to one of three
            strategies, and the routing is what determines whether a fix costs you anything:
          </p>
          <table className="param-table">
            <thead>
              <tr>
                <th>Strategy</th>
                <th>Cost</th>
                <th>What it covers</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="mono">deterministic</span>
                </td>
                <td>Free</td>
                <td>
                  Generated from the crawl we already ran — <span className="mono">llms.txt</span>,{" "}
                  <span className="mono">llms-full.txt</span>, robots.txt AI-crawler rules, the Serve
                  middleware. No credit consumed, ever.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="mono">llm</span>
                </td>
                <td>1 credit</td>
                <td>
                  Needs to read and change your source — client-side-only pricing text, CTAs that
                  ship disabled, empty SPA shells, lazy-loaded content.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="mono">advisory</span>
                </td>
                <td>Free</td>
                <td>
                  No safe automated fix (e.g. script-heavy architecture). Reported, never patched.
                  An unrecognised finding falls back here rather than being changed blind.
                </td>
              </tr>
            </tbody>
          </table>

          <div className="endpoint-card glass">
            <div className="endpoint-head">
              <span className="method m-post">POST</span>
              <span className="endpoint-path">/api/fix</span>
            </div>
            <p className="endpoint-desc">
              Pass <span className="mono">audit_id</span> plus{" "}
              <span className="mono">plan_only: true</span> to see the plan and its cost without
              spending anything. Drop <span className="mono">plan_only</span> to run it: deterministic
              fixes are applied first and unconditionally, then metered fixes run against a cost
              ceiling, and everything lands as one pull request against a new branch.
            </p>
            <p className="endpoint-desc">
              Credits are reserved before any inference and refunded for any fix the model declines
              to make. Returns <span className="mono">402</span> with{" "}
              <span className="mono">code: &quot;insufficient_credits&quot;</span> when the balance
              is short.
            </p>
          </div>

          <div className="endpoint-card glass">
            <div className="endpoint-head">
              <span className="method m-post">POST</span>
              <span className="endpoint-path">/api/github/connect</span>
            </div>
            <p className="endpoint-desc">
              Connects a repository. Use a fine-grained personal access token scoped to that one
              repo, with <span className="mono">Contents: Read and write</span> and{" "}
              <span className="mono">Pull requests: Read and write</span>. Push access is verified
              before the token is stored, and the token is AES-256-GCM encrypted at rest — if{" "}
              <span className="mono">SECRETS_ENCRYPTION_KEY</span> isn&rsquo;t configured the request
              is refused rather than storing it in plaintext.
            </p>
            <p className="endpoint-desc">
              Autofix never pushes to your default branch and never auto-merges. Every change is a
              pull request you review.
            </p>
          </div>
        </section>

        <section className="doc-section" id="billing">
          <h2>
            Billing &amp; payments <span className="tag tag-live">Live</span>
          </h2>
          <p>
            Three gateways are supported. Which one a customer sees depends on the currency they
            pick and which gateways this deployment has keys for — a gateway that can&rsquo;t
            actually charge for the chosen plan is never offered.
          </p>
          <table className="param-table">
            <thead>
              <tr>
                <th>Gateway</th>
                <th>Currencies</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">stripe</td>
                <td>USD, INR</td>
                <td>
                  Cards worldwide. A Stripe <em>India</em> account settles INR and cannot bill
                  USD; billing USD needs a non-India entity.
                </td>
              </tr>
              <tr>
                <td className="mono">paypal</td>
                <td>USD</td>
                <td>
                  Works on an Indian export account. INR is refused — PayPal ended domestic
                  Indian payments in 2021.
                </td>
              </tr>
              <tr>
                <td className="mono">razorpay</td>
                <td>INR, USD</td>
                <td>
                  UPI, Indian cards, netbanking, wallets. Settles into an Indian bank. USD
                  requires International Payments to be activated on the account.
                </td>
              </tr>
            </tbody>
          </table>

          <p>
            Prices are set per currency rather than converted at a live FX rate, so the number on
            the pricing page is the number on the invoice and it only changes when we change it.
          </p>

          <div className="endpoint">
            <div className="endpoint-head">
              <span className="method method-post">POST</span>
              <span className="mono">/api/billing/checkout</span>
            </div>
            <p className="endpoint-desc">
              Body: <span className="mono">{`{ plan, provider?, currency? }`}</span>. Returns{" "}
              <span className="mono">{`{ url }`}</span> — the hosted checkout page — with the same
              shape whichever gateway handled it. Omitting <span className="mono">provider</span>{" "}
              picks the best available one for the currency; omitting{" "}
              <span className="mono">currency</span> infers it from the request country.
            </p>
          </div>

          <div className="endpoint">
            <div className="endpoint-head">
              <span className="method method-post">POST</span>
              <span className="mono">/api/billing/cancel</span>
            </div>
            <p className="endpoint-desc">
              Cancels on whichever gateway holds the subscription, always at the end of the period
              already paid for. PayPal and Razorpay have no hosted portal, so without this a
              customer on either would have to email support to stop paying.
            </p>
          </div>

          <div className="endpoint">
            <div className="endpoint-head">
              <span className="method method-post">POST</span>
              <span className="mono">/api/billing/webhook</span>
              <span className="mono">/paypal</span>
              <span className="mono">/razorpay</span>
            </div>
            <p className="endpoint-desc">
              One endpoint per gateway. Stripe and Razorpay are verified by HMAC over the raw
              request body; PayPal is verified by asking PayPal to confirm the transmission
              signature. An event that cannot be verified — including one where the gateway was
              unreachable — grants nothing.
            </p>
            <p className="endpoint-desc">
              <strong>A checkout redirect never grants a plan.</strong> Only a verified webhook
              does. All three funnel into a single grant path, so three gateways cannot become
              three different ways to become paid. Every event id is claimed against a primary key
              before any side effect, so a retried delivery cannot hand out a second month of
              Autofix credits.
            </p>
          </div>
        </section>

        <section className="doc-section" id="scan">
          <h2>
            Free scan &amp; playground endpoints <span className="tag tag-live">Live</span>
          </h2>
          <div className="endpoint-card glass">
            <div className="endpoint-head">
              <span className="method m-post">POST</span>
              <span className="endpoint-path">/api/scan</span>
            </div>
            <p className="endpoint-desc">
              Score-only, no auth required — powers the homepage&apos;s free ReadScan tool. No
              markdown or raw HTML in the response, just the score and flags.
            </p>
          </div>
          <div className="endpoint-card glass">
            <div className="endpoint-head">
              <span className="method m-post">POST</span>
              <span className="endpoint-path">/api/read</span>
            </div>
            <p className="endpoint-desc">
              Full result (markdown + score + flags), no auth required, 10 requests/min per IP —
              powers this site&apos;s own Playground. Persists to your history if you&apos;re signed in.
            </p>
          </div>
        </section>

        <section className="doc-section" id="serve">
          <h2>
            Serve middleware <span className="tag tag-live">Live</span>
          </h2>
          <p>
            Humans get your site. Verified AI crawlers get the Markdown twin. No published npm
            package yet, so this is the real, copy-pasteable code rather than a fictional install
            command:
          </p>
          <CodeTabs
            tabs={[
              {
                label: "middleware.ts",
                code: `import { NextResponse, type NextRequest } from "next/server";

const AI_CRAWLERS = ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "CCBot", "Bytespider"];

export async function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!AI_CRAWLERS.some((c) => ua.includes(c))) return NextResponse.next();

  const res = await fetch("https://agentread.dev/api/v1/read", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.AGENTREAD_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: request.url }),
  });
  if (!res.ok) return NextResponse.next();
  const { markdown } = await res.json();
  return new Response(markdown, { headers: { "content-type": "text/markdown" } });
}

export const config = { matcher: "/:path*" };`,
              },
            ]}
          />
          <p>
            This exact pattern (crawler UA detection → real distill → Markdown response) is what
            runs on agentread.dev itself, in <code>src/proxy.ts</code>.
          </p>
        </section>

        <section className="doc-section" id="readscore">
          <h2>How ReadScore is computed</h2>
          <p>
            Fully transparent — starts at 100, then deducts for: low payload reduction, high
            script count (&gt;25 tags), price/CTA text present in raw HTML but absent from
            extracted text (JS-only rendering), disabled buy/checkout buttons in markup,
            lazy-loaded content, and a missing <code>/llms.txt</code>. Every deduction ships as a
            human-readable flag alongside the score — see{" "}
            <code>src/lib/engine/read.ts</code> for the exact logic.
          </p>
        </section>

        <section className="doc-section" id="limits">
          <h2>Rate limits</h2>
          <table className="param-table">
            <thead>
              <tr>
                <th>Surface</th>
                <th>Auth</th>
                <th>Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>/api/read, /api/scan</td>
                <td>none</td>
                <td>10 req/min per IP</td>
              </tr>
              <tr>
                <td>/api/v1/read, /api/mcp</td>
                <td>bearer key</td>
                <td>60 req/min per key</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="doc-section" id="roadmap">
          <h2>Roadmap</h2>
          <p>Not built yet — listed here instead of documented as if callable today:</p>
          <ul style={{ color: "var(--text-2)", paddingLeft: 20, display: "grid", gap: 8 }}>
            <li>MCP tools: batch, extract_data (URL + schema → typed data)</li>
            <li>
              Hosted llms.txt — we generate the file today; serving it from your domain on our
              behalf is not built
            </li>
            <li>Pay-per-crawl monetization for publishers (HTTP 402 metering)</li>
            <li>A published npm package for the Serve middleware</li>
            <li>SSO / SAML, audit log, RBAC (Enterprise)</li>
            <li>Act — semantic agent transactions (long-term)</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
