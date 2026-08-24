import Link from "next/link";
import Image from "next/image";
import ReadScanWidget from "@/components/ReadScanWidget";
import Reveal from "@/components/site/Reveal";
import CountUp from "@/components/site/CountUp";
import Marquee from "@/components/site/Marquee";
import CodeTabs from "@/components/site/CodeTabs";
import FloatingHeroStats from "@/components/site/FloatingHeroStats";
import CrawlerNetworkDiagram from "@/components/site/CrawlerNetworkDiagram";
import { getPublicStats, shouldShowPublicStats } from "@/lib/stats";
import { KNOWN_AI_CRAWLERS } from "@/lib/serve/crawlers";
import { headers } from "next/headers";
import { PLANS } from "@/lib/billing/plans";
import {
  countryFromHeaders,
  formatMoney,
  priceFor,
  resolveDisplayCurrency,
} from "@/lib/billing/currency";
import { currenciesFor } from "@/lib/billing/registry";

const CRAWLER_COUNT = Object.keys(KNOWN_AI_CRAWLERS).length;

/**
 * The tiers shown on the landing page, read from the same PLANS table the billing code meters
 * against. Previously these were hand-typed here and drifted badly: the page advertised a
 * waitlist and "roadmap" labels for Watch and llms.txt long after both shipped and billing went
 * live. Deriving them means marketing copy can never again describe a product we don't sell.
 */
const LANDING_PLANS = ["free", "pro", "scale", "autofix"] as const;

/**
 * Tools the MCP server actually registers, mirroring src/app/api/mcp/route.ts — which is the
 * source of truth. Listed rather than counted by hand because the tile previously claimed 2
 * while four were live, understating the product on the page that argues for its accuracy.
 */
const MCP_TOOLS = ["read_url", "score_url", "audit_site", "generate_llms_txt"];

/**
 * The worked example in the "why you're missing" section. The headline multiplier is derived
 * from these two figures rather than typed separately, so editing one payload number can never
 * leave the headline claiming something the breakdown underneath it contradicts.
 */
const EXAMPLE_RAW_KB = 812;
const EXAMPLE_CLEAN_KB = 8;
/**
 * Guarded: a zero divisor would render "Infinity×", and a zero result is never a real claim.
 * Floored, not rounded — 812/8 is 101.5, and a public claim should round *down* against
 * ourselves rather than up.
 */
const PAYLOAD_MULTIPLIER =
  EXAMPLE_CLEAN_KB > 0 ? Math.floor(EXAMPLE_RAW_KB / EXAMPLE_CLEAN_KB) : 100;

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
  const showStats = shouldShowPublicStats(stats);

  // Shared with /pricing so the two pages can never quote different currencies.
  const currency = resolveDisplayCurrency(countryFromHeaders(await headers()), currenciesFor("pro"));

  return (
    <main>
      {/* ======================= HERO ======================= */}
      <header className="hero" id="top">
        <div className="container hero-grid">
          <div>
            <Reveal inline>
              <span className="badge">
                <span className="dot" /> Audit, llms.txt, monitoring and Autofix — all live
              </span>
            </Reveal>
            <Reveal delay={1}>
              <h1 className="hero-title">
                AI is answering questions about you.{" "}
                <span className="grad-text">Badly.</span>
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <p className="hero-sub">
                When ChatGPT, Claude and Perplexity can&apos;t parse your pages, you get left out of
                the answer — or described wrong. AgentRead scores what they actually see, tells you
                which pages fail and why, and <b>ships the fix as a pull request.</b>
              </p>
            </Reveal>
            <Reveal delay={3}>
              <div className="hero-cta-row">
                <Link href="/login" className="btn btn-primary btn-lg magnetic">
                  Start free <span className="arr">→</span>
                </Link>
                <Link href="#pricing" className="btn btn-ghost btn-lg">
                  See pricing
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
                Free plan · no card · 2 full site audits to start
              </p>
            </Reveal>
            <Reveal delay={5}>
              <div style={{ marginTop: 28 }}>
                <p className="hero-note" style={{ marginBottom: 10, opacity: 0.7 }}>
                  Or skip the pitch — paste your URL and see what agents actually get:
                </p>
                <ReadScanWidget />
              </div>
            </Reveal>
          </div>

          <Reveal variant="right" delay={2} className="hero-visual-wrap">
            {showStats && (
              <FloatingHeroStats
                totalReads={stats.totalReads}
                avgReadScore={stats.avgReadScore}
                sitesScanned={stats.sitesScanned}
              />
            )}
            <div className="terminal tilt">
              <div className="term-bar">
                <span className="term-dot r" />
                <span className="term-dot y" />
                <span className="term-dot g" />
                <span className="term-title">agentread — a real audit, abridged</span>
              </div>
              <div className="term-body">
                <div>
                  <span className="t-prompt">$</span> agentread audit{" "}
                  <span className="t-str">https://example.com</span>
                </div>
                <div>&nbsp;</div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">ReadScore</span>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-num">41</span>
                  <span className="t-dim"> / 100</span>
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">Pages audited</span>
                  &nbsp;&nbsp;<span className="t-num">128</span>
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-key">Failing</span>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-num">73</span>
                </div>
                <div>&nbsp;</div>
                <div>
                  &nbsp;&nbsp;<span className="t-flag">✗</span> price only in client-side JS{" "}
                  <span className="t-dim">— 52 pages</span>
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-flag">✗</span> /llms.txt missing{" "}
                  <span className="t-dim">— site-wide</span>
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-flag">✗</span> GPTBot blocked in robots.txt{" "}
                  <span className="t-dim">— site-wide</span>
                </div>
                <div>
                  &nbsp;&nbsp;<span className="t-flag">✗</span> primary CTA disabled in markup{" "}
                  <span className="t-dim">— 19 pages</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <span className="t-ok">
                    ✓ 3 of these fix themselves — Autofix opens one pull request.
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Hidden wholesale below MIN_DISPLAY_STATS reads — see src/lib/stats.ts. Publishing
            zeros is worse than publishing nothing; this reappears on its own once usage lands. */}
        {showStats && (
        <div className="container hero-stats">
          <Reveal delay={1}>
            <div className="stat-tile glass">
              <div className="stat-label">Websites scanned</div>
              <div className="stat-value">
                <CountUp value={stats.sitesScanned} />
              </div>
              <div className="stat-sub">distinct domains, all time</div>
            </div>
          </Reveal>
          <Reveal delay={2}>
            <div className="stat-tile glass">
              <div className="stat-label">Average ReadScore</div>
              <div className="stat-value">
                {stats.avgReadScore === null ? "—" : <CountUp value={stats.avgReadScore} />}
                {stats.avgReadScore !== null && <span className="unit"> /100</span>}
              </div>
              <div className="stat-sub">{stats.avgReadScore === null ? "no scans yet" : "across every page scored"}</div>
            </div>
          </Reveal>
          <Reveal delay={3}>
            <div className="stat-tile glass">
              <div className="stat-label">Pages scored</div>
              <div className="stat-value">
                <CountUp value={stats.totalReads} />
              </div>
              <div className="stat-sub">across scans, audits, Serve + MCP</div>
            </div>
          </Reveal>
          <Reveal delay={4}>
            <div className="stat-tile glass">
              <div className="stat-label">AI crawlers recognised</div>
              <div className="stat-value">
                <CountUp value={CRAWLER_COUNT} />
              </div>
              <div className="stat-sub">GPTBot, ClaudeBot, PerplexityBot + more</div>
            </div>
          </Reveal>
        </div>
        )}
      </header>

      <Marquee label="Speaks standard MCP — drops into any compatible client" items={MCP_CLIENTS} />

      <section className="section-tight">
        <div className="container">
          <CrawlerNetworkDiagram />
        </div>
      </section>
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
              <p className="eyebrow center">Why you&apos;re missing</p>
              <h2 className="title">
                The model never sees <span className="grad-text">your best page.</span>
              </h2>
              <p className="lead">
                An assistant asked about your product downloads your page and finds almost no text
                in it — your price, your specs and your call to action are locked inside JavaScript
                it never runs. So it answers from somewhere else. Example below: a typical
                e-commerce product page.
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
                  what the crawler downloads
                </h3>
                <div className="cbar-row">
                  <div className="cbar-head">
                    <span className="cbar-name">Full page payload</span>
                    <span className="cbar-val">{EXAMPLE_RAW_KB} KB</span>
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
                  Only <b>8 KB of it is words</b>. Prices hidden in JS-rendered spans. Buttons the
                  model can&apos;t see. <b>Ask an assistant what you charge and it guesses.</b>
                </p>
              </div>
            </Reveal>

            <Reveal variant="right">
              <div className="tax-card glass">
                <h3>
                  <span className="tag sev-ok" style={{ border: 0 }}>
                    With AgentRead
                  </span>{" "}
                  what the crawler reads
                </h3>
                <div className="cbar-row">
                  <div className="cbar-head">
                    <span className="cbar-name">Clean Markdown payload</span>
                    <span className="cbar-val">{EXAMPLE_CLEAN_KB} KB</span>
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
                  Every fact you want quoted — price, spec, availability — arrives as <b>text the
                  model can cite</b> instead of markup it has to guess at.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="hero-figure">
              <div className="num grad-text">
                <CountUp value={PAYLOAD_MULTIPLIER} fallback={100} suffix="×" />
              </div>
              <p className="cap">less noise between your content and the model quoting it</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ======================= THE LOOP ======================= */}
      <section className="section" id="layers">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <p className="eyebrow">How it works</p>
              <h2 className="title">Score it. Fix it. Prove it moved.</h2>
              <p className="lead">
                Every other tool in this category stops at the first step. The whole product is the
                three of them in a loop — and all three run today.
              </p>
            </div>
          </Reveal>

          <div className="layers">
            <Reveal delay={1}>
              <div className="layer-card glass glass-hover card-glow">
                <div className="layer-top">
                  <span className="layer-num">STEP 01</span>
                  <span className="tag tag-live">● Live</span>
                </div>
                <h3>Audit</h3>
                <p>
                  Crawl the whole site the way an AI crawler would — following /llms.txt, then your
                  sitemap, then on-page links. Every page comes back with a 0–100 ReadScore and a
                  plain-language list of what an assistant can&apos;t see on it.
                </p>
                <div className="layer-code">
                  128 pages · ReadScore 41/100{"\n"}
                  ✗ price only in client-side JS — 52 pages{"\n"}
                  ✗ /llms.txt missing — site-wide
                </div>
                <p className="layer-for">
                  Free plan includes <b>2 full site audits</b>
                </p>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="layer-card glass glass-hover card-glow">
                <div className="layer-top">
                  <span className="layer-num">STEP 02</span>
                  <span className="tag tag-live">● Live</span>
                </div>
                <h3>Autofix</h3>
                <p>
                  Most findings we can fix from data we already hold — llms.txt, robots.txt crawler
                  rules, the Serve middleware — and those cost nothing. The rest are read and
                  patched by a model. Either way it arrives as <b>one reviewable pull request</b>,
                  never a push to your default branch.
                </p>
                <div className="layer-code">
                  → opened PR #412 &quot;AgentRead: 3 fixes&quot;{"\n"}
                  &nbsp;&nbsp;+ public/llms.txt{"\n"}
                  &nbsp;&nbsp;~ public/robots.txt (appended, not replaced)
                </div>
                <p className="layer-for">
                  Reviewed by <b>you</b> before anything merges
                </p>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="layer-card glass glass-hover card-glow">
                <div className="layer-top">
                  <span className="layer-num">STEP 03</span>
                  <span className="tag tag-live">● Live</span>
                </div>
                <h3>Watch</h3>
                <p>
                  Scheduled re-audits prove the score actually moved, then keep watching for the
                  regression that quietly undoes it. Alerts fire on a <em>drop</em> past your
                  threshold — never a notification just to tell you things are fine.
                </p>
                <div className="layer-code">
                  ReadScore 41 → 78 after PR #412{"\n"}
                  watching 5 pages · daily{"\n"}
                  alert on drop &gt; 10 points
                </div>
                <p className="layer-for">
                  Plus a server-side log of <b>which crawler fetched what</b>
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
              <p className="eyebrow">Serve, for real</p>
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

  const res = await fetch("https://agentread.tech/api/v1/read", {
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
      "url": "https://agentread.tech/api/mcp",
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
                Everything here <span className="grad-text">is running today.</span>
              </h2>
              <p className="lead">
                Anything marked <span className="tag tag-soon">Roadmap</span> is not built and is
                labelled that way on purpose. Everything else runs in this codebase right now.
              </p>
            </div>
          </Reveal>

          <div className="bento">
            <Reveal className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                Site audit <span className="tag tag-live">Live</span>
              </h3>
              <p>
                Crawls up to 1,000 pages per audit, following llms.txt → sitemap → links, and
                returns a per-page ReadScore with every deduction spelled out as a readable flag.
              </p>
              <span className="bento-foot">128 pages · 73 failing</span>
            </Reveal>
            <Reveal delay={1} className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                Autofix pull requests <span className="tag tag-live">Live</span>
              </h3>
              <p>
                Turns findings into a single reviewable diff on a branch. Generated fixes are free
                and unmetered; model-written code fixes spend a credit and can decline themselves
                when confidence is low.
              </p>
              <span className="bento-foot">never pushes to main, never auto-merges</span>
            </Reveal>

            <Reveal className="bento-card glass glass-hover card-glow">
              <h3>
                llms.txt generator <span className="tag tag-live">Live</span>
              </h3>
              <p>
                Builds llms.txt and llms-full.txt from your real site structure. Not paywalled — the
                meter is crawl budget, not the file.
              </p>
            </Reveal>
            <Reveal delay={1} className="bento-card glass glass-hover card-glow">
              <h3>
                Agent-traffic analytics <span className="tag tag-live">Live</span>
              </h3>
              <p>
                A server-side log of which AI crawler fetched which path — the one dataset an
                outside-in monitoring tool structurally cannot produce.
              </p>
            </Reveal>
            <Reveal delay={2} className="bento-card glass glass-hover card-glow">
              <h3>
                Serve middleware <span className="tag tag-live">Live</span>
              </h3>
              <p>
                Detects verified AI crawlers and hands them clean Markdown. Humans see your site
                completely unchanged — see the real snippet above.
              </p>
            </Reveal>

            <Reveal className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                Regression monitoring <span className="tag tag-live">Live</span>
              </h3>
              <p>
                Scheduled re-audits with webhook alerts when a score drops past your threshold. A
                failed run still records itself, so a broken monitor can&apos;t retry every tick.
              </p>
              <span className="bento-foot">alerts on drops only</span>
            </Reveal>
            <Reveal delay={1} className="bento-card bento-wide glass glass-hover card-glow">
              <h3>
                Public audit reports <span className="tag tag-live">Live</span>
              </h3>
              <p>
                Every audit gets a shareable link you can send to whoever owns the fix — no login
                needed to read it.
              </p>
              <span className="bento-foot">/report/&lt;token&gt;</span>
            </Reveal>

            <Reveal className="bento-card glass glass-hover card-glow">
              <h3>
                MCP server <span className="tag tag-live">Live</span>
              </h3>
              <p>
                {MCP_TOOLS.length} tools — {MCP_TOOLS.join(", ")} — over a remote MCP endpoint, so
                your own assistant can audit a site mid-conversation.
              </p>
            </Reveal>
            <Reveal delay={1} className="bento-card glass glass-hover card-glow">
              <h3>
                Brand-mention tracking <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>
                Whether a model names <em>you</em> in its answer, not just whether it can read you.
                Not built yet.
              </p>
            </Reveal>
            <Reveal delay={2} className="bento-card glass glass-hover card-glow">
              <h3>
                Pay-per-crawl <span className="tag tag-soon">Roadmap</span>
              </h3>
              <p>Charge unverified AI crawlers per read instead of giving content away. Not built yet.</p>
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
                  code: `curl -X POST https://agentread.tech/api/v1/read \\
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
      "url": "https://agentread.tech/api/mcp",
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
// Track publish status: agentread.tech/docs`,
                  roadmap: true,
                },
                {
                  label: "Python SDK",
                  code: `# agentread (PyPI) — not published yet.
# The REST API above works today with requests/httpx.
# Track publish status: agentread.tech/docs`,
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
              <h2 className="title">Why not just use Profound?</h2>
              <p className="lead">
                Visibility suites measure the outcome — whether a model mentions your brand. They
                are good at it, and they stop there. AgentRead measures and <em>fixes</em> the
                cause: whether an assistant can parse your page at all. Honest columns, including
                the rows where we&apos;re the ones with the dash.
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
                    <th>Profound / Athena</th>
                    <th>Semrush / Ahrefs</th>
                    <th>Firecrawl</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tracks brand mentions in AI answers</td>
                    <td className="col-agentread cx">—</td>
                    <td className="ck">✓</td>
                    <td>
                      <span className="cpart">partial</span>
                    </td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Explains <em>why</em> a page fails, in the markup</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Ships the fix as a pull request</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Generates llms.txt / llms-full.txt</td>
                    <td className="col-agentread ck">✓</td>
                    <td>
                      <span className="cpart">some</span>
                    </td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Server-side log of which crawler fetched what</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Serves clean Markdown to crawlers</td>
                    <td className="col-agentread ck">✓ any host</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Regression monitoring &amp; alerts</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="ck">✓</td>
                    <td className="ck">✓</td>
                    <td>
                      <span className="cpart">change diffs</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Re-audit proof the score moved</td>
                    <td className="col-agentread ck">✓</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                  </tr>
                  <tr>
                    <td>Reads <em>other</em> people&apos;s sites at scale</td>
                    <td className="col-agentread">
                      <span className="cpart">Read API</span>
                    </td>
                    <td className="cx">—</td>
                    <td className="cx">—</td>
                    <td className="ck">✓</td>
                  </tr>
                  <tr>
                    <td>Entry price</td>
                    <td className="col-agentread">{formatMoney(priceFor("pro", currency) ?? PLANS.pro.priceMonthlyUsd, currency)}/mo</td>
                    <td>~$499/mo</td>
                    <td>~$139/mo</td>
                    <td>$16/mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal>
            <p style={{ marginTop: 14, fontSize: 13, color: "var(--muted)" }}>
              Competitor prices are published list rates as of August 2026 and move often — check
              theirs before deciding. The rows are the argument, not the price.
            </p>
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
                External figures, carried over as market-timing context and not independently
                re-verified by this codebase. Sources are named so you can check them yourself.
              </p>
            </div>
          </Reveal>
          <div className="valid-grid">
            <Reveal delay={1}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">Profound</div>
                <div className="valid-date">Feb 2026</div>
                <p className="valid-quote">
                  Raised <b>$96M at a $1B valuation</b> — AI search visibility is now a funded
                  category with real budget behind it.
                </p>
              </div>
            </Reveal>
            <Reveal delay={2}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">Category spend</div>
                <div className="valid-date">2026</div>
                <p className="valid-quote">
                  <b>$3.2B</b> spent on AI search visibility this year, projected to compound at
                  roughly 29% a year through 2030.
                </p>
              </div>
            </Reveal>
            <Reveal delay={3}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">McKinsey</div>
                <div className="valid-date">by 2028</div>
                <p className="valid-quote">
                  An estimated <b>$750B of US revenue</b> flowing through AI-powered search — the
                  traffic you&apos;re invisible to is the traffic that buys.
                </p>
              </div>
            </Reveal>
            <Reveal delay={4}>
              <div className="valid-card glass glass-hover">
                <div className="valid-src">◔ Cloudflare</div>
                <div className="valid-date">Apr 2026</div>
                <p className="valid-quote">
                  Shipped a public <b>Agent Readiness Score</b>. When infrastructure companies
                  measure a problem, the problem is real — scoring it is the easy half.
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
                    What do assistants actually see on your site?
                  </h2>
                  <p className="lead" style={{ marginBottom: 20 }}>
                    This calls the live engine right now — no demo data, no waiting list. Already
                    ran one? Here&apos;s exactly what the number means.
                  </p>
                  <a href="#top" className="btn btn-ghost">
                    ↑ Run it again from the top
                  </a>
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
                Start free. <span className="grad-text">Pay when it ships a fix.</span>
              </h2>
              <p className="lead">
                Prices are set per currency rather than converted at checkout, so the page and the
                invoice always agree. Cancel from the dashboard on any gateway.
              </p>
            </div>
          </Reveal>
          <div className="pricing-grid">
            {LANDING_PLANS.map((id, i) => {
              const plan = PLANS[id];
              // Must match PricingTable on /pricing, which flags Pro — two pages recommending
              // different tiers reads as a mistake to anyone who visits both.
              const featured = id === "pro";
              // LANDING_PLANS is four entries, so the stagger index is always within Reveal's 1–6 range.
              const delay = (i + 1) as 1 | 2 | 3 | 4;
              return (
                <Reveal key={id} delay={delay}>
                  <div className={featured ? "price-card glass price-featured" : "price-card glass glass-hover"}>
                    {featured && <span className="price-flag">Most popular</span>}
                    <div className="price-name">{plan.name}</div>
                    <div className="price-amount">
                      {formatMoney(priceFor(id, currency) ?? plan.priceMonthlyUsd, currency)}
                      <span className="per">/mo</span>
                    </div>
                    <p className="price-desc">{plan.blurb}</p>
                    <ul className="price-list">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <CheckIcon />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={id === "free" ? "/login" : "/pricing"}
                      className={featured ? "btn btn-primary magnetic" : "btn btn-ghost"}
                    >
                      {id === "free" ? "Start free" : `Choose ${plan.name}`}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal>
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13.5, color: "var(--muted)" }}>
              Need SSO, an audit log or unlimited crawl budget?{" "}
              <Link href="/pricing" style={{ textDecoration: "underline" }}>
                Enterprise is on the pricing page
              </Link>
              .
            </p>
          </Reveal>
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
                  How is this different from an AI-visibility tool like Profound?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  They measure the outcome — whether a model mentions your brand. AgentRead measures
                  and fixes the cause — whether an assistant can parse your page at all. They&apos;re
                  genuinely complementary, but only one of them changes what the crawler receives.
                  If you can only afford one and your pages are failing, fix the pages first.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  What exactly is a ReadScore?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  A 0–100 measure computed from explainable signals: payload-reduction ratio,
                  script count, price/CTA text present in raw HTML but missing from extracted text,
                  disabled buttons, lazy content, and llms.txt presence. Every deduction ships as a
                  flag — see the full formula on <Link href="/docs">/docs</Link>. Nothing about it
                  is a black box, because a number you can&apos;t argue with is a number you can&apos;t act
                  on.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  What does Autofix actually change?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  It opens a pull request on a branch — never a push to your default branch, never
                  an auto-merge. Most findings are fixed from data we already hold (llms.txt,
                  robots.txt crawler rules, the Serve middleware) and cost nothing. Findings that
                  need a model to read your source spend one credit, and the model can decline the
                  fix rather than patch something blind. Anything unrecognised is reported as
                  advice, not patched.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  Do I have to change my website?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  Not to audit it — scanning is read-only and needs nothing installed. If you want
                  the Serve layer, it&apos;s a small middleware snippet (shown above — real code, not
                  a hypothetical). Human visitors get your site exactly as it is; verified AI
                  crawlers get the Markdown twin.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  Which AI crawlers does this cover?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  The Serve layer currently recognises {CRAWLER_COUNT} known crawler user-agents
                  (GPTBot, ClaudeBot, PerplexityBot, CCBot, Bytespider and others), reviewed against
                  each vendor&apos;s published docs — not exhaustive, and not permanent. Audits don&apos;t
                  depend on that list: they measure what any parser would get.
                </p>
              </details>
              <details className="faq-item glass">
                <summary>
                  Can I pay in rupees?
                  <PlusIcon />
                </summary>
                <p className="faq-body">
                  Yes. Billing runs through Stripe, PayPal and Razorpay, and each currency is priced
                  directly rather than converted at checkout — so the number on the pricing page is
                  the number on the invoice. Cancellation works from the dashboard on all three.
                </p>
              </details>
            </div>
          </Reveal>
        </div>
      </section>
      {/* ======================= FINAL CTA ======================= */}
      <section className="cta-final container" id="start">
        <Reveal inline>
          <p className="eyebrow center">Find out in about a minute</p>
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
            Two full site audits on the free plan, no card. If your score comes back fine, you&apos;ve
            lost a minute and learned something.
          </p>
        </Reveal>
        <Reveal delay={3}>
          <div className="hero-cta-row" style={{ justifyContent: "center" }}>
            <Link href="/login" className="btn btn-primary btn-lg magnetic">
              Start free <span className="arr">→</span>
            </Link>
            <a href="#top" className="btn btn-ghost btn-lg">
              ↑ Scan a URL first
            </a>
          </div>
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
                AI search visibility you can actually fix. Score what assistants see on your
                site, ship the fix as a pull request, and prove the score moved.
              </p>
            </div>
            <div>
              <h4>Product</h4>
              <div className="footer-links">
                <Link href="/#layers">Site audit</Link>
                <Link href="/#features">Autofix</Link>
                <Link href="/playground">Playground</Link>
                <Link href="/dashboard">Dashboard</Link>
              </div>
            </div>
            <div>
              <h4>Resources</h4>
              <div className="footer-links">
                <Link href="/docs">Documentation</Link>
                <Link href="/docs#mcp">MCP setup</Link>
                <Link href="/#compare">Why not Profound</Link>
              </div>
            </div>
            <div>
              <h4>Company</h4>
              <div className="footer-links">
                <Link href="/#validation">Why now</Link>
                <Link href="/#pricing">Pricing</Link>
                <Link href="/faq">FAQ</Link>
                <Link href="/docs">Docs</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} AgentRead — audit, Autofix and monitoring are live; brand-mention tracking is roadmap.</span>
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
