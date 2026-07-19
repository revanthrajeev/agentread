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
          <a className="side-link" href="#scan">POST /api/scan (free)</a>
        </div>
        <div className="side-group">
          <div className="side-title">Serve · Layer 2</div>
          <a className="side-link" href="#serve">Next.js middleware</a>
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
                <td>batch</td>
                <td>
                  <span className="tag tag-soon">Roadmap</span>
                </td>
                <td>Many URLs in one call</td>
              </tr>
              <tr>
                <td>map_site</td>
                <td>
                  <span className="tag tag-soon">Roadmap</span>
                </td>
                <td>Domain → crawlable outline</td>
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
            <li>MCP tools: batch, map_site, extract_data</li>
            <li>Crawl (whole-domain Markdown corpus)</li>
            <li>Watch (change-detection webhooks)</li>
            <li>llms.txt Studio (auto-generate &amp; host llms.txt / llms-full.txt)</li>
            <li>Agent-traffic analytics dashboard</li>
            <li>Pay-per-crawl monetization for publishers</li>
            <li>Billing / Stripe integration</li>
            <li>Act — semantic agent transactions (long-term)</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
