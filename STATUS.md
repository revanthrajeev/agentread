# AgentRead — Build Status

*What exists, what's real, what's left. Written 2026-07-06, updated 2026-08-05.*

---

## Summary

AgentRead is a working Next.js + Supabase application, not a mockup. The core product —
fetch a URL, extract it, score its AI-agent readability — runs for real on every request.
Auth, database, a functional dashboard, a bearer-auth Read API, a remote MCP server, and
Serve middleware (Layer 2) are all wired end-to-end and verified.

**2026-08-05 — the commercial layer.** The product now has something to sell and a way to
charge for it. Site Audit (crawl a whole host, score every page, roll the issues up),
llms.txt / llms-full.txt generation, scheduled Watch monitoring with regression alerts,
agent-traffic analytics, monthly usage metering, and billing are all built and
verified. `npm run verify` runs 150 real assertions — pure logic plus live crawls against
real sites — and passes.

**2026-08-05 — three payment gateways.** Stripe, PayPal and Razorpay are all wired, behind
one provider interface. This is an incorporation constraint, not a preference: a Stripe
*India* account settles INR and cannot bill USD, PayPal India is cross-border USD only
(domestic INR ended in 2021), and only Razorpay settles rupees into an Indian bank. Prices
are set per currency (USD and INR) rather than FX-converted. All three funnel into one
grant path, so three gateways cannot become three ways to become paid.

**Positioning.** The market splits two ways: extraction APIs (Firecrawl from $16/mo, Jina
Reader effectively free) and AI-visibility suites (Profound $58.5M raised, Peec AI $30M+).
Selling extraction loses to free; selling another visibility dashboard loses to $58M.
AgentRead sits in the gap — visibility tools tell you that you're missing from AI answers,
AgentRead tells you *why* in the markup and ships the fix. Score → diagnose → serve → prove
it improved. Pricing (Free / $29 Pro / $99 Scale) is set deliberately just above the
extraction tier and far below the visibility suites.

**2026-07-19 — design system + Serve middleware merge.** The original static concept demo
(`onto-website/`, all data simulated) has been fully merged into this app and retired —
its visual design (glass-morphism, dark/light theme + 4 accent presets, animated stats,
comparison table, pricing, FAQ) is now real React/Tailwind components here, wired to real
data throughout (no fabricated stats; unbuilt features are clearly tagged "Roadmap," not
implied to exist). A Three.js particle scene (`src/components/site/SiteCanvas.tsx`) was
added as a scroll-reactive hero/background layer. This is the only version of AgentRead
going forward.

---

## ✅ Fully functional right now

| Feature | Detail |
|---|---|
| **Real extraction engine** | `src/lib/engine/read.ts` — fetches the target URL live, runs Mozilla Readability (the engine behind Firefox Reader Mode) to extract the article body, converts it to Markdown with Turndown, and returns it. Verified against a live site during build (`example.com`) with real byte counts. |
| **ReadScore heuristic** | Transparent 0–100 score computed from explainable signals: payload-reduction ratio, `<script>` tag count, price/CTA text present in raw HTML but missing from extracted text (JS-only rendering), disabled buy/checkout buttons, lazy-loaded content, and a live check for `/llms.txt`. Every deduction ships as a human-readable flag — not a black box. |
| **`/api/read`** | POST a URL, get back Markdown + ReadScore + flags + token/byte stats. Rate-limited (10/min/IP) to protect the free tier. Persists to the database if the caller is signed in. |
| **`/api/scan`** | Score-only, no auth required — powers the public ReadScan tool on the homepage. |
| **`/api/waitlist`** | Real email capture into Supabase (once a live project is connected). |
| **Auth** | Google OAuth *and* email magic link via Supabase Auth. Magic link works with zero extra config beyond a Supabase project; Google needs a one-time OAuth client setup (see `SETUP.md`). |
| **Route protection** | `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` — a real breaking change caught and handled during this build) gates `/dashboard`; the dashboard page also independently re-checks auth as defense in depth, per Next.js's own recommendation. Verified via direct request testing: unauthenticated requests to `/dashboard` correctly 307-redirect to `/login`. |
| **Dashboard** | Real per-user data from Postgres (Supabase): read history, aggregate stats (total reads, average ReadScore, tokens saved), and API key management — all protected by row-level security so each user only ever sees their own rows. |
| **API key issuance** | Keys are generated, sha-256 hashed before storage (plaintext is shown exactly once at creation and never persisted or retrievable again), and revocable. |
| **`/api/v1/read`** | The authenticated public Read API. Requires `Authorization: Bearer sk-ar-...`; 401s on missing/invalid/revoked keys. 60 req/min per key (vs. 10/min/IP on the anonymous playground endpoint). Verifies the key by sha-256 lookup against `api_keys` via a service-role Supabase client (`src/lib/supabase/admin.ts`) — necessary because a bearer-token caller has no session cookie to satisfy the RLS `auth.uid()` policies. Persists every read to `reads` under the key owner's `user_id` and best-effort updates `last_used_at`. |
| **`/api/mcp`** | A real remote MCP server (Streamable HTTP transport, stateless — fresh `McpServer` + transport per request, matching serverless execution) exposing `read_url` and `score_url` tools, gated by the same bearer-auth as `/api/v1/read`. Point any MCP client (Claude, ChatGPT connectors, custom agents) at this URL with an AgentRead API key. |
| **Serve middleware (Layer 2)** | `src/lib/serve/agentReadMiddleware.ts`, wired into `src/proxy.ts`. Detects known AI-crawler User-Agents (GPTBot, ClaudeBot, PerplexityBot, and others — `src/lib/serve/crawlers.ts`) and serves them the real distilled Markdown (same engine as `/api/v1/read`) instead of full page HTML; everyone else gets the page unchanged. **This site runs its own Serve middleware on itself** — verified via `curl -A "GPTBot/1.1" https://<deployed-url>/` returning `content-type: text/markdown` with `x-readscore`/`x-agentread-crawler` headers. |
| **Landing page** | Live ReadScan widget calling the real API (not demo data), a working waitlist form, a real aggregate-stats query (`src/lib/stats.ts` — total reads, avg ReadScore across all users, honest "just launched" state when empty), and a full design-system rebuild (glass-morphism, dark/light theme + accent picker, Three.js hero canvas, comparison table, pricing, FAQ) — every "Roadmap" tag is real, not a single fabricated stat. |
| **Playground** | Reskinned with a real animated ReadScore gauge and risk-flag cards, fed entirely by the real `/api/read` response — including a real raw-HTML snippet (`ReadResult.htmlSnippet`, added this session) shown side-by-side with the real Markdown output. |
| **Dashboard** | Reskinned with real per-user KPI tiles and a real "reads per day" chart (`src/components/site/ReadsChart.tsx`) computed from the signed-in user's actual `reads` rows — empty state shown honestly when there's no data yet, never a fake chart. |
| **Docs page** | Publishes the ReadScore methodology in full, documents only real endpoints (`/api/v1/read`, `/api/mcp`, `/api/read`, `/api/scan`, Serve), and lists everything else under a clearly separate "Roadmap" section rather than documenting unbuilt endpoints as if callable today. |
| **Production build** | `npm run build` and `npm run lint` both compile/pass clean with zero errors and zero warnings. |

**Bug fixed this session:** `proxy.ts` was sitting at the repo root, but this project uses
a `src/app` layout — Next.js was silently never registering it as middleware at all (confirmed
via an empty `functions: {}` in the build's middleware manifest before the fix). The
`/dashboard` auth-gate "worked" only because of the page-level defense-in-depth check;
the proxy-level gate had likely never actually run. Fixed by moving it to `src/proxy.ts` —
confirmed via build output now showing `ƒ Proxy (Middleware)` as a registered route.

---

## ⏳ Set up once, not yet done (infrastructure — needs your input, not more code)

| Step | Why it's on you | Where the instructions are |
|---|---|---|
| Create a live Supabase project | Needs your own account/billing | `SETUP.md` §1 |
| Run `supabase/schema.sql` | One paste into the Supabase SQL Editor | `SETUP.md` §1 |
| Run `supabase/schema_v2.sql` | Second paste — audits, watches, agent_hits, usage, billing columns | `SETUP.md` §1 |
| Run `supabase/schema_v3.sql` | Third paste — Autofix: github_connections, fix_jobs, fix_attempts, credits, margin view | `SETUP.md` §1 |
| Run `supabase/schema_v4.sql` | Fourth paste — multi-gateway billing: provider columns, webhook dedupe, payments ledger, revenue views | `SETUP.md` §1 |
| Set `SECRETS_ENCRYPTION_KEY` | Required before any GitHub token can be stored (`openssl rand -base64 48`) | `.env.example` |
| Set `ANTHROPIC_API_KEY` | Only needed for code fixes; deterministic fixes work without it | `.env.example` |
| **Pick at least one payment gateway** | You need only one to start. Which one depends on your entity — see the gateway table in `.env.example` | `.env.example` |
| Create Stripe products + prices | Needs your Stripe account; set `STRIPE_PRICE_PRO` / `STRIPE_PRICE_SCALE` | `.env.example` |
| Add the Stripe webhook endpoint | Point it at `/api/billing/webhook`, set `STRIPE_WEBHOOK_SECRET` | `.env.example` |
| Create PayPal plans (optional) | Product → billing plans (`P-...`), USD only; set `PAYPAL_WEBHOOK_ID` and point it at `/api/billing/webhook/paypal` | `.env.example` |
| Create Razorpay plans (optional) | Per-currency plans (`plan_...`); webhook → `/api/billing/webhook/razorpay`. USD needs International Payments activated separately | `.env.example` |
| Set `CRON_SECRET` | Enables scheduled Watch runs; Vercel Cron sends it automatically | `vercel.json` |
| Create a Google OAuth client | Tied to your Google Cloud account | `SETUP.md` §2 |
| Push to a GitHub repo | Needs a repo you own | `SETUP.md` §3 |
| Deploy to Vercel | Free tier, needs your account | `SETUP.md` §4 |
| Buy a domain (optional) | agentread.tech/.com/.ai | `SETUP.md` §5 |

None of this requires more engineering — it's ~20 minutes of account setup, walked through
step by step in `SETUP.md`.

---

## 🆕 Built 2026-08-05 (the commercial layer)

| Feature | Detail |
|---|---|
| **Site Audit engine** | `src/lib/engine/crawl.ts` — discovers pages via `/llms.txt`, then `/sitemap.xml` (following one level of sitemap-index nesting), then on-page links, and falls back to the seed URL. Same-host only, asset extensions skipped, URLs canonicalized so `/a`, `/a/` and `/a#x` don't each burn a page slot. Crawls with 4-way bounded concurrency, then rolls per-page flags into a site-level issue list. A site where *every* page fails is reported as a failed audit, never as a real score of 0. |
| **`/api/v1/audit` + `/api/audit`** | Bearer-auth and session-auth twins. Quota is checked *before* the crawl starts (so an over-limit caller doesn't burn a minute of crawl time) and recorded after it lands. Returns `402` with `code: "quota_exceeded"` when the allowance is spent. `maxDuration = 300` because a real crawl legitimately runs for minutes. |
| **llms.txt / llms-full.txt** | `src/lib/engine/llmstxt.ts` — follows the llms.txt proposal (H1, `>` summary, `##` sections of `- [title](url): description`). Sections are grouped by first path segment; descriptions are the page's real first sentence. `llms-full.txt` concatenates every page's Markdown — the Mintlify/Anthropic variant that measures roughly 2× the crawler traffic of the index. Deliberately **not** paywalled: the meter is crawl budget, not the feature, because this is the acquisition channel. |
| **Watch / monitoring** | `src/lib/watch/runner.ts` + `/api/cron/watch`. Re-audits on a schedule; alerts only on a *drop* past the user's threshold, never on improvement. Webhook alerts work with zero extra infrastructure; email is optional via `RESEND_API_KEY`. A failed run still stamps `last_run_at` so a permanently-broken watch doesn't retry every tick. Wired to Vercel Cron in `vercel.json`. |
| **Agent-traffic analytics** | `src/lib/analytics/agentHits.ts`, recorded as a by-product of the Serve path. This is the dataset visibility suites can't produce from outside: not an estimate of citations, but a server-side log of which crawler fetched which path and what it was served. |
| **Usage metering + plans** | `src/lib/billing/plans.ts` / `usage.ts`. Counters increment through a Postgres `increment_usage` function so concurrent calls can't both read and write back the same `+1`. Metering **fails open** — a usage-table outage must not take the API down. Legacy plan values (`developer`, `read_api`, `sdk_control`) resolve to free rather than silently granting paid limits. |
| **Stripe billing** | Checkout, customer portal, and a signature-verified webhook. The webhook is the *only* thing that grants a plan — a client-side success redirect never does, since it can be forged or simply never fire. Losing an active subscription drops the user to free. Every entry point degrades cleanly when keys are unset. |
| **New surfaces** | `/pricing`, `/report/[token]` (public shareable audit — the growth loop), and dashboard pages for audits, audit detail, llms.txt Studio, Watch, agent analytics, and billing. The old sidebar's four inert "soon" placeholders are now real routes. |
| **MCP tools** | `audit_site` and `generate_llms_txt` added alongside `read_url` / `score_url`. |
| **`npm run verify`** | 64 real assertions: URL canonicalization, plan/quota maths, watch scheduling windows, score banding, plus live crawls of real sites and llms.txt generation checked against the pages actually crawled. Passing as of 2026-08-05. |

## 🆕 Built 2026-08-05 (Autofix — the layer that closes the loop)

Diagnosis was the product; now the fix is. Autofix turns audit findings into a GitHub
pull request. **The unit economics live in the routing decision, not the model choice.**

| Piece | Detail |
|---|---|
| **The router** | `src/lib/fix/router.ts` — every ReadScore finding is classified `deterministic` (generate it from data we already hold), `llm` (needs to read customer source), or `advisory` (no safe automated fix; reported, never patched). An unrecognised finding falls back to advisory rather than being patched blind. Most findings route to `deterministic`, so most fixes ship at **zero inference cost**. |
| **Deterministic fixers** | `src/lib/fix/deterministic.ts` — llms.txt + llms-full.txt (from the crawl we already ran), robots.txt AI-crawler rules (**appends**, never overwrites existing rules), and the Serve middleware emitted as real source. Cost: $0, always. |
| **Metered fixer** | `src/lib/fix/llm.ts` — Claude Opus 5 with structured output, so the model returns a typed patch instead of prose to parse. Three cost levers: repo context sits behind a `cache_control` breakpoint (cache reads are 0.1× base, so fix #2 onward is ~4× cheaper); `effort` is tuned per issue (`low` for a CTA fix, `high` for an empty shell) since effort is the primary cost lever on Opus 5; and the model can set `confident: false` to decline rather than invent a change. |
| **Margin guard** | `src/lib/fix/pricing.ts` — real rates ($5/$25 per MTok), real cache multipliers. `checkMargin()` runs *before* any inference, so an unprofitable job is rejected for free. Per-fix and per-job cost ceilings bound a runaway repo. Measured: **$0.431 per fix → 85.6% gross margin at $3/credit.** `fix_job_margin` (SQL view) reports realised margin per job so pricing is measured, not assumed. |
| **GitHub** | `src/lib/github/client.ts` — six REST calls, no Octokit dependency. Blobs → one tree → one commit → PR, so a multi-file fix is a single reviewable diff. **Never pushes to the default branch and never auto-merges** — a human reviews machine-written code before it ships. Push access is verified at connect time, before a job spends inference on a token that can't open a PR. |
| **Token security** | `src/lib/crypto/secrets.ts` — GitHub push tokens are AES-256-GCM encrypted before reaching Postgres. A database compromise alone yields ciphertext, not push access to customer repos. The app **refuses to store a token at all** if `SECRETS_ENCRYPTION_KEY` isn't set, rather than falling back to plaintext. Tampered ciphertext fails to decrypt (verified). |
| **Credits** | Reserved *before* inference via a Postgres function that refuses to go negative (two concurrent jobs can't spend the same last credit), and refunded for any fix the model declined. Deterministic fixes never consume one. |
| **Surfaces** | `/dashboard/autofix`, an Autofix panel on every audit detail page, and a free plan-only preview so the user sees exactly what's free vs. metered before committing a credit. New **Autofix tier at $299/mo** with 100 credits. |

---

## 🆕 Built 2026-08-05 (multi-gateway payments — Stripe + PayPal + Razorpay)

| Feature | Detail |
| --- | --- |
| **Why three** | An incorporation constraint, not a preference. A Stripe **India** account settles INR and *cannot bill USD*, and RBI e-mandate rules make card subscriptions awkward. PayPal works on an Indian export account but is **USD only** — domestic INR ended in 2021. Razorpay is the only one that settles rupees into an Indian bank, and its international mode (a separate activation, approved per business) auto-generates the FIRA/eFIRC an exporter needs at audit time. Each gateway declares what it can actually charge, so an impossible combination is refused up front instead of failing at the gateway. |
| **Provider interface** | `src/lib/billing/provider.ts` + `registry.ts` — one `PaymentProvider` contract implemented by all three. `/api/billing/checkout` returns `{ url }` with the same shape whichever gateway handled it, so the client never knows which one it's talking to. Only gateways that are *both* configured *and* priced for the chosen plan/currency are offered. |
| **One grant path** | `src/lib/billing/grant.ts` — the single place a user can become paid. Three webhooks funnel into it, so three gateways cannot become three ways to grant a plan wrongly. **A checkout redirect still grants nothing**; only a signature-verified webhook does. |
| **Webhook verification** | Stripe and Razorpay verify an HMAC over the *raw* body (Razorpay's compared with `timingSafeEqual` — a plain `===` leaks how much of a guessed signature was right). PayPal is verified by asking PayPal to confirm the transmission signature. An event that can't be verified — **including one where the gateway was unreachable** — grants nothing. |
| **Idempotency (fixes a real bug)** | Every event id is claimed against a Postgres primary key before any side effect. Previously a retried Stripe `invoice.paid` would grant a second month of Autofix credits — and all three gateways retry on any non-2xx. Doing this as a read-then-write in app code would let two concurrent deliveries both pass. |
| **Multi-currency** | `src/lib/billing/currency.ts` — USD and INR prices are **set, not FX-converted**, so the number on the pricing page is the number on the invoice and only changes when we change it. Pro is $29 / ₹1,499. INR is offered only where a gateway can actually charge rupees. Country is inferred from the CDN geo header to preselect, never to force. |
| **Cancellation** | `/api/billing/cancel` works on all three, always at period end. PayPal and Razorpay have no hosted portal, so without it a customer on either would have to email support to stop paying — the fastest route to a chargeback. |
| **Revenue ledger** | `payments` table + `revenue_by_month` / `subscribers_by_provider` views. Revenue arrives in three dashboards and two currencies; without one table, "what did we make last month" means adding three reports by hand — and that's the number an investor asks for first. |
| **Verified** | 44 new assertions (150 total, all passing) covering price/minor-unit maths, per-gateway currency refusals, active-status rules, and signature verification against forged, tampered, truncated and wrong-secret inputs. Runtime-checked: a forged Razorpay signature is rejected 400, a valid one passes the gate, and PayPal's approve-URL and cancel calls typecheck against the live API shapes. |

## 🔭 Not built yet (real product roadmap, not infrastructure)

- More MCP tools: `batch`, `extract_data` (URL + schema → typed data)
- Hosted llms.txt — we generate the file, but don't serve it from the customer's domain
- Pay-per-crawl monetization for publishers (HTTP 402 metering)
- A published `@agentread/node`/`@agentread/next` npm package (the Serve middleware code is real today, just not packaged — see `/docs`)
- SSO / SAML, audit log, RBAC (Enterprise)
- Act layer (long-term — semantic agent transactions)

---

## Files in this delivery

```
agentread-app/
├── SETUP.md                        ← step-by-step: Supabase, Google OAuth, GitHub, deploy
├── PROJECT.md                      ← pitch-deck source doc — paste into Gamma AI
├── STATUS.md                       ← this file
├── supabase/schema.sql             ← full database schema, paste into Supabase SQL Editor
├── src/
│   ├── proxy.ts                    ← Next.js middleware: auth session refresh + Serve crawler gate
│   ├── lib/engine/read.ts          ← the real extraction + scoring engine
│   ├── lib/serve/                  ← Serve middleware (Layer 2) + crawler UA list
│   ├── lib/supabase/               ← auth client/server/middleware + admin (service-role) helpers
│   ├── lib/stats.ts                ← real public aggregate stats for the landing page
│   ├── components/site/            ← design-system primitives: SiteCanvas (Three.js), Reveal,
│   │                                  CountUp, Gauge, ReadsChart, CodeTabs, ThemeAccentToggle, …
│   ├── app/api/                    ← /read, /scan, /v1/read, /mcp, /waitlist route handlers
│   ├── app/dashboard/               ← real dashboard + API key management + real chart
│   ├── app/playground/             ← live Read API demo page
│   ├── app/login/                  ← Google + magic-link sign-in
│   └── app/page.tsx                ← landing page: 3D hero, real stats, live/roadmap labeling
```

---

## Naming

**AgentRead** — chosen after a working name ("Onto," borrowed from a reference product)
and a rejected alternative ("Pith" — collides with an existing AI-agent-memory company).
Brand family: **ReadScore** (the metric) · **ReadScan** (the free tool) · **AR+** (paid tier).
Verified clear of company/domain/GitHub-project collisions as of 2026-07-06.
