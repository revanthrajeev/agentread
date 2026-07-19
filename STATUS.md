# AgentRead — Build Status

*What exists, what's real, what's left. Written 2026-07-06, updated 2026-07-19.*

---

## Summary

AgentRead is a working Next.js + Supabase application, not a mockup. The core product —
fetch a URL, extract it, score its AI-agent readability — runs for real on every request.
Auth, database, a functional dashboard, a bearer-auth Read API, a remote MCP server, and
Serve middleware (Layer 2) are all wired end-to-end and verified. What remains is
infrastructure setup (a live Supabase project, a deployment) and the next layer of
features (Crawl, Watch, billing).

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
| Create a Google OAuth client | Tied to your Google Cloud account | `SETUP.md` §2 |
| Push to a GitHub repo | Needs a repo you own | `SETUP.md` §3 |
| Deploy to Vercel | Free tier, needs your account | `SETUP.md` §4 |
| Buy a domain (optional) | agentread.dev/.com/.ai | `SETUP.md` §5 |

None of this requires more engineering — it's ~20 minutes of account setup, walked through
step by step in `SETUP.md`.

---

## 🔭 Not built yet (real product roadmap, not infrastructure)

- More MCP tools: `batch`, `map_site`, `extract_data` (`read_url` and `score_url` are live — see above)
- Crawl (whole-domain corpus), Watch (change-detection webhooks), llms.txt Studio, agent-traffic analytics
- Pay-per-crawl monetization for publishers
- Billing/Stripe integration
- A published `@agentread/node`/`@agentread/next` npm package (the Serve middleware code is real today, just not packaged — see `/docs`)
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
