import Link from "next/link";
import Image from "next/image";
import ReadScanWidget from "@/components/ReadScanWidget";
import WaitlistForm from "@/components/WaitlistForm";
import Reveal from "@/components/site/Reveal";
import CountUp from "@/components/site/CountUp";
import Marquee from "@/components/site/Marquee";
import CodeTabs from "@/components/site/CodeTabs";
import { getPublicStats } from "@/lib/stats";
import { KNOWN_AI_CRAWLERS } from "@/lib/serve/crawlers";

const CRAWLER_COUNT = Object.keys(KNOWN_AI_CRAWLERS).length;

const MCP_CLIENTS = [
  "Claude Code",
  "Claude Desktop",
  "Cursor",
  "Cline",
  "Zed",
  "Continue",
  "ChatGPT connectors",
  "VS Code",
];

export default async function Home() {
  const stats = await getPublicStats();

  return (
    <main>
      {/* ======================= HERO ======================= */}
      <header className="hero">
        <div className="container hero-grid">
          <div>
            <Reveal inline>
              <span className="badge">
                <span className="dot" /> Layer 1 + Layer 2 live — real Read API, real Serve middleware
              </span>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="hero-title">
                Agents can&apos;t read <span className="grad-text">your website.</span>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="hero-sub">
                AgentRead serves every AI agent clean, scored Markdown while humans see your site
                untouched. <b>Same content, a fraction of the tokens, one line of middleware.</b>
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="hero-cta-row">
                <Link href="/login" className="btn btn-primary btn-lg magnetic">
                  Get started free <span className="arr">→</span>
                </Link>
                <Link href="/playground" className="btn btn-ghost btn-lg">
                  See how you rank
                </Link>
              </div>
            </Reveal>
            <Reveal delay={4}>
              <p className="hero-note">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13 4.5 6.5 11 3 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                1,000 free reads / month · no credit card · MCP server included
              </p>
            </Reveal>
          </div>

          <Reveal variant="right" delay={2}>
            <div className="terminal tilt">
              <div className="term-bar">
                <span className="term-dot r" />
                <span className="term-dot y" />
                <span className="term-dot g" />
                <span className="term-title">agentread — real request, real response</span>
              </div>
              <div className="term-body">
                <div>
                  <span className="t-prompt">$</span> curl <span className="t-flag">-X POST</span>{" "}
                  https://agentread.dev/api/v1/read \
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-flag">-H</span>{" "}
                  <span className="t-str">&quot;Authorization: Bearer $AGENTREAD_API_KEY&quot;</span> \
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-flag">-d</span>{" "}
                  <span className="t-str">
                    &apos;{"{"}&quot;url&quot;: &quot;https://example.com/pricing&quot;{"}"}&apos;
                  </span>
                </div>
                <div>&nbsp;</div>
                <div>{"{"}</div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">&quot;markdown&quot;</span>:{" "}
                  <span className="t-str">&quot;# Pricing\n\n…&quot;</span>,
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">&quot;readScore&quot;</span>: <span className="t-num">82</span>,
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">&quot;hallucinationRisk&quot;</span>:{" "}
                  <span className="t-str">&quot;low&quot;</span>,
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">&quot;tokensAfter&quot;</span>: <span className="t-num">1942</span>,
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">&quot;cache&quot;</span>: <span className="t-str">&quot;HIT&quot;</span>
                </div>
                <div>{"}"}</div>
                <div style={{ marginTop: 10 }}>
                  <span className="t-ok">✓ real fields, real engine — see it run in the Playground.</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="container hero-stats">
          <Reveal delay={1}>
            <div className="stat-tile glass">
              <div className="stat-label">Reads processed</div>
              <div className="stat-value">
                <CountUp value={stats.totalReads} />
              </div>
              <div className="stat-sub">across the Read API + Serve + MCP</div>
            </div>
          </Reveal>
          <Reveal delay={2}>
            <div className="stat-tile glass">
              <div className="stat-label">Average ReadScore</div>
              <div className="stat-value">
                {stats.avgReadScore === null ? "—" : <CountUp value={stats.avgReadScore} />}
                {stats.avgReadScore !== null && <span className="unit"> /100</span>}
              </div>
              <div className="stat-sub">{stats.avgReadScore === null ? "no reads yet" : "across all reads"}</div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="stat-tile glass">
              <div className="stat-label">MCP tools live</div>
              <div className="stat-value">
                <CountUp value={2} />
              </div>
              <div className="stat-sub">read_url · score_url</div>
            </div>
          </Reveal>
          <Reveal delay={4}>
            <div className="stat-tile glass">
              <div className="stat-label">AI crawlers auto-served</div>
              <div className="stat-value">
                <CountUp value={CRAWLER_COUNT} />
              </div>
              <div className="stat-sub">GPTBot, ClaudeBot, PerplexityBot + more</div>
            </div>
          </Reveal>
        </div>
      </header>

      <Marquee label="Speaks standard MCP — drops into any compatible client" items={MCP_CLIENTS} />

      {/* ======================= PRODUCT VISUAL ======================= */}
      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="glass" style={{ padding: 8, borderRadius: "var(--r-lg)", overflow: "hidden" }}>
              <Image
                src="/og.png"
                alt="Illustrative preview of the AgentRead dashboard style — glass panels, ReadScore gauge, trend chart"
                width={1376}
                height={768}
                style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }}
                priority={false}
              />
            </div>
            <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
              Illustrative preview — see it running for real in the{" "}
              <Link href="/playground" style={{ textDecoration: "underline" }}>
                Playground
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </section>

      {/* ======================= RENDER TAX ======================= */}
      <section className="section" id="problem">
        <div className="container">
          <Reveal>
            <div className="section-head center">
              <p className="eyebrow center">The Render Tax</p>
              <h2 className="title">
                Most of what you ship <span className="grad-text">isn&apos;t content.</span>
              </h2>
              <p className="lead">
                Your site ships JavaScript bundles, CSS frameworks and tracking pixels to a reader
                that wants none of it. Agents pay for every token of that noise — then hallucinate
                around it. Example below: a typical e-commerce product page.
              </p>
            </div>
          </Reveal>

          <div className="tax-grid">
            <Reveal variant="left">
              <div className="tax-card glass">
                <h3>
                  <span className="tag sev-high" style={{ border: 0 }}>
                    Raw HTML
                  </span>{" "}
                  what the agent downloads
                </h3>
                <div className="cbar-row">
                  <div className="cbar-head">
                    <span className="cbar-name">Full page payload</span>
                    <span className="cbar-val">812 KB</span>
                  </div>
                  <div className="cbar-track neutral">
                    <div className="cbar-fill muted" style={{ width: "100%" }} />
                  </div>
                </div>
                <div className="tax-breakdown">
                  <div className="tax-line">
                    <span>JavaScript bundles</span>
                    <strong>486 KB</strong>
                  </div>
                  <div className="tax-line">
                    <span>CSS frameworks</span>
                    <strong>214 KB</strong>
                  </div>
                  <div className="tax-line">
                    <span>Tracking &amp; analytics</span>
                    <strong>74 KB</strong>
                  </div>
                  <div className="tax-line">
                    <span>Markup scaffolding</span>
                    <strong>30 KB</strong>
                  </div>
                  <div className="tax-line">
                    <span>Actual content</span>
                    <strong>8 KB</strong>
                  </div>
                </div>
                <p className="tax-footnote">
                  ≈ <b>203,114 tokens</b> per read. Prices hidden in JS-rendered spans. Buttons the
                  model can&apos;t see. <b>That&apos;s where hallucinations come from.</b>
                </p>
              </div>
            </Reveal>

            <Reveal variant="right">
              <div className="tax-card glass">
                <h3>
                  <span className="tag sev-ok" style={{ border: 0 }}>
                    With AgentRead
                  </span>{" "}
                  what the agent receives
                </h3>
                <div className="cbar-row">
                  <div className="cbar-head">
                    <span className="cbar-name">Clean Markdown payload</span>
                    <span className="cbar-val">8 KB</span>
                  </div>
                  <div className="cbar-track">
                    <div className="cbar-fill brand" style={{ width: "4%", minWidth: 6 }} />
                  </div>
                </div>
                <div className="tax-breakdown">
                  <div className="tax-line">
                    <span>Structured Markdown</span>
                    <strong>8 KB</strong>
                  </div>
                  <div className="tax-line">
                    <span>Tokens per read</span>
                    <strong>1,942</strong>
                  </div>
                  <div className="tax-line">
                    <span>ReadScore</span>
                    <strong>82 / 100</strong>
                  </div>
                  <div className="tax-line">
                    <span>Hallucination risk</span>
                    <strong>low</strong>
                  </div>
                  <div className="tax-line">
                    <span>Repeat read (cache HIT)</span>
                    <strong>&lt; 10 ms</strong>
                  </div>
                </div>
                <p className="tax-footnote">
                  Input cost per read drops from roughly <b>$0.61</b> to <b>$0.006</b> at $3/M
                  tokens on this example. Multiply by every agent, every visit, every day.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="hero-figure">
              <div className="num grad-text">
                <CountUp value={101} suffix="×" />
              </div>
              <p className="cap">less payload on this example — the render tax, refunded</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================= THREE LAYERS ======================= */}
      <section className="section" id="layers">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">Architecture</p>
              <h2 className="title">Read today. Serve today. Act next.</h2>
              <p className="lead">
                One engine under all three layers: read any site clean now, serve your own site
                agent-legible today, then let agents transact on it.
              </p>
            </div>
          </Reveal>

          <div className="layers">
            <Reveal delay={1}>
              <div className="layer-card glass glass-hover card-glow">
                <div className="layer-top">
                  <span className="layer-num">LAYER 01</span>
                  <span className="tag tag-live">● Live</span>
                </div>
                <h3>Read</h3>
                <p>
                  REST API + remote MCP server that turns any URL into clean, scored Markdown —
                  with an explainable ReadScore and hallucination-risk flags on every response.
                </p>
                <div className="layer-code">
                  curl -X POST https://agentread.dev/api/v1/read \{"\n"}
                  {"  "}-H &quot;Authorization: Bearer sk-ar-…&quot; \{"\n"}
                  {"  "}-d {"'"}{"{"}&quot;url&quot;: &quot;https://example.com&quot;{"}"}
                  {"'"}
                </div>
                <p className="layer-for">
                  For <b>AI developers</b> building agents
                </p>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="layer-card glass glass-hover card-glow">
                <div className="layer-top">
                  <span className="layer-num">LAYER 02</span>
                  <span className="tag tag-live">● Live</span>
                </div>
                <h3>Serve</h3>
                <p>
                  Next.js middleware that detects verified AI crawlers and serves them the same
                  clean Markdown, while human visitors see your site completely unchanged. This
                  site runs its own Serve middleware on itself — try curling it with a GPTBot
                  user-agent.
                </p>
                <div className="layer-code">
                  UA matches GPTBot / ClaudeBot / PerplexityBot / …{"\n"}
                  → served text/markdown, ReadScore in headers{"\n"}
                  → everyone else → your page, unchanged
                </div>
                <p className="layer-for">
                  For <b>site owners &amp; engineering teams</b> — see the real snippet below
                </p>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="layer-card glass glass-hover card-glow">
                <div className="layer-top">
                  <span className="layer-num">LAYER 03</span>
                  <span className="tag tag-soon">◌ Roadmap</span>
                </div>
                <h3>Act</h3>
                <p>
                  The browser interaction layer. Agents stop scraping pixels and start executing
                  intents — semantically, against the same clean structure they read. Not built
                  yet — the honest label is &quot;future,&quot; not a quarter we&apos;d have to walk back.
                </p>
                <div className="layer-code">
                  await agentread.act({"{"}{"\n"}
                  {"  "}intent: &quot;buy pro plan&quot;,{"\n"}
                  {"  "}site: &quot;store.example.com&quot;{"\n"}
                  {"}"}){"\n"}
                  <span className="t-dim">{"// not implemented — roadmap"}</span>
                </div>
                <p className="layer-for">
                  For <b>autonomous agents</b> and the agent economy
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ======================= SERVE SNIPPET ======================= */}
      <section className="section-tight" id="serve">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">Layer 2, for real</p>
              <h2 className="title">The actual middleware — not a package that doesn&apos;t exist yet.</h2>
              <p className="lead">
                No published npm package yet, so here&apos;s the real, working code instead of a
                fictional install command. Paste this into any Next.js site&apos;s middleware once
                you have an AgentRead API key.
              </p>
            </div>
          </Reveal>
          <Reveal>
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
  if (!res.ok) return NextResponse.next(); // never block a crawler on our own failure
  const { markdown } = await res.json();
  return new Response(markdown, { headers: { "content-type": "text/markdown" } });
}

export const config = { matcher: "/:path*" };`,
                },
              ]}
            />
          </Reveal>
        </div>
      </section>

      {/* ======================= MCP ======================= */}
      <section className="section" id="mcp">
        <div className="container mcp-grid">
          <Reveal variant="left">
            <p className="eyebrow">MCP native</p>
            <h2 className="title">Speak MCP? Then you&apos;re already done.</h2>
            <p className="lead">
              One config block and any MCP-capable client can read and score the live web — with
              risk flags attached. Remote server, no local install required.
            </p>
            <div className="tool-chips">
              <span className="tool-chip">read_url</span>
              <span className="tool-chip">score_url</span>
              <span className="tool-chip roadmap">batch (roadmap)</span>
              <span className="tool-chip roadmap">map_site (roadmap)</span>
              <span className="tool-chip roadmap">extract_data (roadmap)</span>
            </div>
            <div className="client-row">
              {MCP_CLIENTS.map((c) => (
                <span key={c}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13 4.5 6.5 11 3 7.5"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal variant="right">
            <div className="code-window tilt">
              <div className="code-tabs">
                <button className="code-tab active" type="button">
                  .mcp.json
                </button>
              </div>
              <div className="code-pane active">
                <pre>{`{
  "mcpServers": {
    "agentread": {
      "url": "https://agentread.dev/api/mcp",
      "headers": { "Authorization": "Bearer sk-ar-…" }
    }
  }
}`}</pre>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================= FEATURES BENTO ======================= */}
      <section className="section" id="features">
        <div className="container">
          <Reveal>
            <div className="section-head center">
              <p className="eyebrow center">What&apos;s in the box</p>
              <h2 className="title">
                Built for agents. <span className="grad-text">Honest about what&apos;s next.</span>
              </h2>
              <p className="lead">
                Everything below marked <span className="tag tag-live">Live</span> runs for real
                in this codebase today. Everything marked{" "}
                <span className="tag tag-soon">Roadmap</span> is exactly that — not yet built, not
                pretending otherwise.
              </p>
            </div>
          </Reveal>

          <div className="bento">
            <Reveal className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                ReadScore <span className="tag tag-live">Live</span>
              </h3>
              <p>
                Every read returns a 0–100 score for how faithfully the Markdown represents the
                page an agent would act on — fully transparent, every deduction ships as a
                human-readable flag.
              </p>
              <span className="bento-foot">&quot;readScore&quot;: 82</span>
            </Reveal>
            <Reveal delay={1} className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                Hallucination risk flags <span className="tag tag-live">Live</span>
              </h3>
              <p>
                JS-only prices, disabled buttons, missing content — flagged per read with
                severity, so your agent knows what <em>not</em> to trust.
              </p>
              <span className="bento-foot">&quot;hallucinationRisk&quot;: &quot;low&quot;</span>
            </Reveal>

            <Reveal className="bento-card glass glass-hover card-glow">
              <h3>
                Serve middleware <span className="tag tag-live">Live</span>
              </h3>
              <p>Detects known AI crawlers and serves them Markdown instead of full HTML — see the real snippet above.</p>
            </Reveal>
            <Reveal delay={1} className="bento-card glass glass-hover card-glow">
              <h3>In-memory response cache</h3>
              <p>Repeat reads within 10 minutes return instantly from cache — no re-fetch, re-render, or re-score.</p>
            </Reveal>
            <Reveal delay={2} className="bento-card glass glass-hover card-glow">
              <h3>
                Batch &amp; site maps <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>
                <code>batch</code> reading many URLs in one call and <code>map_site</code> for a
                crawlable domain outline — not built yet.
              </p>
            </Reveal>

            <Reveal className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                Crawl <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>Point at a domain, get the whole site as a clean Markdown corpus for RAG ingestion. Not built yet.</p>
            </Reveal>
            <Reveal delay={1} className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                Watch <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>Diff-based change detection with webhooks when a page&apos;s content changes. Not built yet.</p>
            </Reveal>

            <Reveal className="bento-card glass glass-hover card-glow">
              <h3>
                llms.txt Studio <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>Auto-generate and host your llms.txt / llms-full.txt. Not built yet.</p>
            </Reveal>
            <Reveal delay={1} className="bento-card glass glass-hover card-glow">
              <h3>
                Agent analytics <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>See which agents read you and what they misread. Not built yet.</p>
            </Reveal>
            <Reveal delay={2} className="bento-card glass glass-hover card-glow">
              <h3>
                Pay-per-crawl <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>Charge unverified AI crawlers per read instead of giving away content free. Not built yet.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ======================= DEVELOPER EXPERIENCE ======================= */}
      <section className="section" id="dx">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">Developer experience</p>
              <h2 className="title">Real endpoints. No fictional SDKs.</h2>
            </div>
          </Reveal>
          <Reveal>
            <CodeTabs
              tabs={[
                {
                  label: "cURL",
                  code: `curl -X POST https://agentread.dev/api/v1/read \\
  -H "Authorization: Bearer $AGENTREAD_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/pricing"}'

# → { "markdown": "# Pricing…", "readScore": 82,
#     "hallucinationRisk": "low", "tokensAfter": 1942, "cache": "MISS" }`,
                },
                {
                  label: "MCP",
                  code: `// .mcp.json — remote server, no install
{
  "mcpServers": {
    "agentread": {
      "url": "https://agentread.dev/api/mcp",
      "headers": { "Authorization": "Bearer sk-ar-…" }
    }
  }
}
// exposes read_url and score_url tools`,
                },
                {
                  label: "Serve (Next.js)",
                  code: `// middleware.ts — real code, see the Layer 2 section above
// for the full working snippet.`,
                },
                {
                  label: "Node SDK",
                  code: `// @agentread/node — not published yet.
// The REST API above works today with any HTTP client.
// Track publish status: agentread.dev/docs`,
                  roadmap: true,
                },
                {
                  label: "Python SDK",
                  code: `# agentread (PyPI) — not published yet.
# The REST API above works today with requests/httpx.
# Track publish status: agentread.dev/docs`,
                  roadmap: true,
                },
              ]}
            />
          </Reveal>
        </div>
      </section>

      {/* ======================= COMPARISON ======================= */}
      <section className="section" id="compare">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">Why not just use…</p>
              <h2 className="title">Why not just use Firecrawl?</h2>
              <p className="lead">
                Scrapers read other people&apos;s sites. AgentRead also fixes how <em>your</em> site
                is read — and is honest about which parts of that are live vs. roadmap.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="table-wrap">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th className="col-agentread">AgentRead</th>
                    <th>Firecrawl</th>
                    <th>Browserbase</th>
                    <th>Vercel / Cloudflare</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Clean HTML → Markdown</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="ck">✓</td>
                    <td className="cx">—</td>
                    <td>
                      <span className="cpart">edge only</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Explainable ReadScore</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Hallucination risk flags</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Serve your own site to agents</td>
                    <td className="col-agentread ck">✓ any host</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td>
                      <span className="cpart">their infra only</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Cached repeat reads</td>
                    <td className="col-agentread ck">✓ 10 min TTL</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="ck">✓</td>
                  </tr>
                  <tr>
                    <td>Change tracking / Watch</td>
                    <td className="col-agentread">
                      <span className="cpart">roadmap</span>
                    </td>
                    <td className="ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Structured extraction</td>
                    <td className="col-agentread">
                      <span className="cpart">roadmap</span>
                    </td>
                    <td className="ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Browser interaction</td>
                    <td className="col-agentread">
                      <span className="cpart">Act · roadmap</span>
                    </td>
                    <td>
                      <span className="cpart">actions</span>
                    </td>
                    <td className="ck">✓</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Monetize agent traffic</td>
                    <td className="col-agentread">
                      <span className="cpart">roadmap</span>
                    </td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td>
                      <span className="cpart">CF pilot</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================= VALIDATION ======================= */}
      <section className="section" id="validation">
        <div className="container">
          <Reveal>
            <div className="section-head center">
              <p className="eyebrow center">Signal, not hype</p>
              <h2 className="title">The shift is already public.</h2>
              <p className="lead">
                External citations from PROJECT.md — not independently re-verified by this codebase, carried over as market-timing context.
              </p>
            </div>
          </Reveal>
          <div className="valid-grid">
            <Reveal delay={1}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">▲ Vercel</div>
                <div className="valid-date">Feb 2026</div>
                <p className="valid-quote">
                  &quot;<b>~99% payload reduction</b> observed&quot; serving Markdown to agents from
                  their own edge.
                </p>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">◔ Cloudflare</div>
                <div className="valid-date">Feb 2026</div>
                <p className="valid-quote">
                  &quot;<b>&lt;15 ms</b> native HTML→MD at the edge&quot; — conversion is becoming a
                  network primitive.
                </p>
              </div>
            </Reveal>
            <Reveal delay={3}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">✳ Anthropic</div>
                <div className="valid-date">2023 →</div>
                <p className="valid-quote">
                  Research showing <b>context structure</b> materially improves model accuracy on
                  downstream tasks.
                </p>
              </div>
            </Reveal>
            <Reveal delay={4}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">Y Combinator</div>
                <div className="valid-date">Summer 2026</div>
                <p className="valid-quote">
                  RFS calling for <b>agent-economy infrastructure</b> — the rails agents will read,
                  pay and act through.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ======================= LIVE READSCAN ======================= */}
      <section className="section-tight">
        <div className="container">
          <Reveal>
            <div className="scan-band glass">
              <div className="scan-inner">
                <div>
                  <p className="eyebrow">Free ReadScan — really live</p>
                  <h2 className="title" style={{ fontSize: "clamp(26px,3.4vw,38px)" }}>
                    How readable are you to agents? Find out for real.
                  </h2>
                  <p className="lead" style={{ marginBottom: 20 }}>
                    This calls the live Read API right now — no demo data, no waitlist.
                  </p>
                  <ReadScanWidget />
                </div>
                <div className="terminal">
                  <div className="term-bar">
                    <span className="term-dot r" />
                    <span className="term-dot y" />
                    <span className="term-dot g" />
                    <span className="term-title">how ReadScore is computed</span>
                  </div>
                  <div className="term-body" style={{ minHeight: 0, padding: "18px 20px" }}>
                    <div>
                      Starts at <span className="t-num">100</span>, deducts for:
                    </div>
                    <div>
                      <span className="t-dim">├─</span> low payload reduction
                    </div>
                    <div>
                      <span className="t-dim">├─</span> heavy script count (&gt;25 tags)
                    </div>
                    <div>
                      <span className="t-dim">├─</span> price/CTA text missing from extracted text
                    </div>
                    <div>
                      <span className="t-dim">├─</span> disabled buy/checkout buttons
                    </div>
                    <div>
                      <span className="t-dim">├─</span> lazy-loaded content
                    </div>
                    <div>
                      <span className="t-dim">└─</span> missing /llms.txt
                    </div>
                    <div>&nbsp;</div>
                    <div>
                      <span className="t-ok">fully documented →</span> /docs
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================= PRICING ======================= */}
      <section className="section" id="pricing">
        <div className="container">
          <Reveal>
            <div className="section-head center">
              <p className="eyebrow center">Pricing</p>
              <h2 className="title">
                Start free. <span className="grad-text">Lock the founding price.</span>
              </h2>
              <p className="lead">
                Billing isn&apos;t wired up yet — paid tiers below are the plan, join the waitlist to
                lock the rate when it ships.
              </p>
            </div>
          </Reveal>
          <div className="pricing-grid">
            <Reveal delay={1}>
              <div className="price-card glass glass-hover">
                <div className="price-name">Developer</div>
                <div className="price-amount">$0</div>
                <p className="price-desc">For hacking on agents, tonight.</p>
                <ul className="price-list">
                  <li>
                    <CheckIcon />
                    1,000 reads / month
                  </li>
                  <li>
                    <CheckIcon />
                    Real MCP server (read_url, score_url)
                  </li>
                  <li>
                    <CheckIcon />
                    ReadScores on every read
                  </li>
                  <li>
                    <CheckIcon />
                    Community support
                  </li>
                </ul>
                <Link href="/login" className="btn btn-ghost">
                  Start free
                </Link>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="price-card glass glass-hover">
                <div className="price-name">Read API</div>
                <div className="price-amount">
                  Usage<span className="per"> · pay per read</span>
                </div>
                <p className="price-desc">Scale with your agents, not a seat count.</p>
                <ul className="price-list">
                  <li>
                    <CheckIcon />
                    Same bearer-auth endpoint, higher limits
                  </li>
                  <li>
                    <CheckIcon />
                    Batch, map_site &amp; extract{" "}
                    <span className="tag tag-soon" style={{ marginLeft: 4 }}>
                      roadmap
                    </span>
                  </li>
                  <li>
                    <CheckIcon />
                    Crawl &amp; Watch{" "}
                    <span className="tag tag-soon" style={{ marginLeft: 4 }}>
                      roadmap
                    </span>
                  </li>
                </ul>
                <Link href="/docs" className="btn btn-ghost">
                  View API docs
                </Link>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="price-card glass price-featured">
                <span className="price-flag">Founding price · locked when billing ships</span>
                <div className="price-name">SDK + Control Plane</div>
                <div className="price-amount">
                  $99<span className="per">/mo</span>
                </div>
                <p className="price-desc">Your site, perfectly readable by every agent.</p>
                <ul className="price-list">
                  <li>
                    <CheckIcon />
                    Serve middleware, any host — live today
                  </li>
                  <li>
                    <CheckIcon />
                    ReadScore monitoring &amp; alerts{" "}
                    <span className="tag tag-soon" style={{ marginLeft: 4 }}>
                      roadmap
                    </span>
                  </li>
                  <li>
                    <CheckIcon />
                    llms.txt Studio{" "}
                    <span className="tag tag-soon" style={{ marginLeft: 4 }}>
                      roadmap
                    </span>
                  </li>
                  <li>
                    <CheckIcon />
                    Founding rate, forever
                  </li>
                </ul>
                <a href="#waitlist" className="btn btn-primary magnetic">
                  Join waitlist
                </a>
              </div>
            </Reveal>

            <Reveal delay={4}>
              <div className="price-card glass glass-hover">
                <div className="price-name">Enterprise</div>
                <div className="price-amount">Custom</div>
                <p className="price-desc">For platforms and publishers at agent scale.</p>
                <ul className="price-list">
                  <li>
                    <CheckIcon />
                    Pay-per-crawl monetization{" "}
                    <span className="tag tag-soon" style={{ marginLeft: 4 }}>
                      roadmap
                    </span>
                  </li>
                  <li>
                    <CheckIcon />
                    Dedicated regions, SSO, audit logs{" "}
                    <span className="tag tag-soon" style={{ marginLeft: 4 }}>
                      roadmap
                    </span>
                  </li>
                  <li>
                    <CheckIcon />
                    Early access to Act
                  </li>
                </ul>
                <a href="#waitlist" className="btn btn-ghost">
                  Talk to us
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ======================= FAQ ======================= */}
      <section className="section" id="faq">
        <div className="container">
          <Reveal>
            <div className="section-head center">
              <p className="eyebrow center">FAQ</p>
              <h2 className="title">Questions, answered.</h2>
            </div>
          </Reveal>
          <Reveal>
            <div className="faq">
              <details className="faq-item glass">
                <summary>
                  How is AgentRead different from Firecrawl?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  Firecrawl reads other people&apos;s sites well, at scale, with funding AgentRead
                  doesn&apos;t have. AgentRead reads too — with a ReadScore and hallucination flags
                  Firecrawl doesn&apos;t have — but the differentiated bet is Layer 2: making{" "}
                  <em>your</em> site serve clean Markdown to agents from real middleware (live
                  today, not a roadmap promise), plus the ReadScore standard itself.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  What exactly is a ReadScore?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  A 0–100 measure computed from explainable signals: payload-reduction ratio,
                  script count, price/CTA text present in raw HTML but missing from extracted
                  text, disabled buttons, lazy content, and llms.txt presence. Every deduction
                  ships as a flag — see the full formula on <Link href="/docs">/docs</Link>.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  Do I have to change my website?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  No. The Serve layer is a small middleware snippet (shown above — real code, not
                  a hypothetical). Human visitors get your site exactly as it is; verified AI
                  crawlers get the Markdown twin.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  What are hallucination risk flags?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  Per-read warnings on things agents commonly get wrong: prices rendered only in
                  client-side JavaScript, CTAs disabled in markup, very little extractable text.
                  Your agent gets the flag alongside the Markdown, so it can hedge instead of
                  confidently inventing an answer.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  Which AI agents and crawlers are supported?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  The Read API and MCP server work with anything that can call REST or MCP. The
                  Serve layer currently recognizes {CRAWLER_COUNT} known crawler user-agents
                  (GPTBot, ClaudeBot, PerplexityBot, CCBot, Bytespider and others) — this list is
                  reviewed against each vendor&apos;s published docs, not exhaustive or permanent.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  When does Act ship?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  No committed date — it&apos;s the least-scoped layer and the least honest thing we
                  could do is promise a quarter. It builds on the same structure Read/Serve
                  already produce, so agents already consuming AgentRead Markdown won&apos;t need to
                  migrate when it lands.
                </p>
              </details>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================= FINAL CTA ======================= */}
      <section className="cta-final container" id="waitlist">
        <Reveal inline>
          <p className="eyebrow center">Early access</p>
        </Reveal>
        <Reveal delay={1}>
          <h2 className="title" style={{ fontSize: "clamp(32px,5vw,52px)" }}>
            Agents are already reading you.
            <br />
            <span className="grad-text">Make sure they read you right.</span>
          </h2>
        </Reveal>
        <Reveal delay={2}>
          <p className="lead" style={{ marginInline: "auto" }}>
            Join the waitlist — founding price locked the day billing ships.
          </p>
        </Reveal>
        <Reveal delay={3}>
          <WaitlistForm />
        </Reveal>
      </section>

      {/* ======================= FOOTER ======================= */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link className="logo" href="/">
                <span className="logo-mark">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="5.4" stroke="white" strokeWidth="2.2" />
                    <circle cx="8" cy="8" r="2.2" fill="white" />
                  </svg>
                </span>
                agentread
              </Link>
              <p className="footer-desc">
                The readability layer of the agent economy. Read the web clean today; serve your
                own site to agents today; let them act on it next.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <div className="footer-links">
                <Link href="/#layers">Read API</Link>
                <Link href="/#serve">Serve middleware</Link>
                <Link href="/playground">Playground</Link>
                <Link href="/dashboard">Dashboard</Link>
              </div>
            </div>
            <div>
              <h4>Resources</h4>
              <div className="footer-links">
                <Link href="/docs">Documentation</Link>
                <Link href="/docs#mcp">MCP setup</Link>
                <Link href="/#compare">Why not Firecrawl</Link>
              </div>
            </div>
            <div>
              <h4>Company</h4>
              <div className="footer-links">
                <Link href="/#validation">Why now</Link>
                <Link href="/#pricing">Pricing</Link>
                <Link href="/#faq">FAQ</Link>
                <a href="#waitlist">Contact</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} AgentRead — Read + Serve are real and running; Act is roadmap.</span>
            <span style={{ display: "flex", gap: 16 }}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M13 4.5 6.5 11 3 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="plus" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
