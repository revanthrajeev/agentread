# AgentRead — Pitch Deck Source Document

*Paste this whole file into Gamma AI ("Generate from text/markdown") to produce a pitch deck.
Each `##` heading below is designed to become one slide. Speaker notes are in italics under
each section — Gamma can use them as slide notes.*

---

## 1. Cover

**AgentRead**
Make your website readable to the AI agents already reading it.

*Tagline for the title slide: "Agents can't read your website."*

---

## 2. The Problem

AI agents (ChatGPT browsing, Claude with web tools, Perplexity, custom LLM agents) are now a
meaningful share of web traffic. But websites were built for human browsers, not agents:

- A typical page ships **~800 KB of HTML** — JavaScript bundles, CSS frameworks, tracking
  scripts, ad slots — to deliver **~8 KB of actual content**.
- Agents pay (literally, in API token cost) for every byte of that noise.
- Worse: prices, buttons, and availability are often rendered *client-side only*. An agent
  reading raw HTML sees an empty skeleton — no price, no working "buy" button — and
  either fails silently or **hallucinates** an answer.
- There is no standard today for "is my site readable by an agent," the way Lighthouse
  standardized "is my site fast."

*Speaker note: open with a live demo — run a real site through the ReadScan tool on stage,
show the score, show the flags. This problem is more convincing shown than told.*

---

## 3. The Solution

**AgentRead reads any URL and returns clean, scored Markdown instead of raw HTML.**

1. Fetch the page.
2. Extract the real content (Mozilla Readability — the same engine behind Firefox Reader Mode).
3. Convert to clean Markdown (Turndown).
4. Score it 0–100 (**ReadScore**) using transparent, explainable signals.
5. Flag specific risks (JS-only prices, disabled buttons, missing `/llms.txt`, lazy content).

This is a **working product today** — not a mockup. `/api/read` and `/api/scan` in this
codebase perform real network fetches and real extraction on every call.

*Speaker note: emphasize "transparent" — unlike a black-box AI score, every point deducted
from ReadScore maps to a specific, explainable flag a developer can go fix.*

---

## 4. How It Works (Architecture)

Three layers, one engine:

- **Layer 1 — Read** *(live today)*: REST API + (planned) MCP server. Any developer or
  agent can POST a URL and get back Markdown + ReadScore + risk flags.
- **Layer 2 — Serve** *(next)*: one line of Next.js middleware that serves this same
  clean Markdown directly to verified AI crawlers (GPTBot, ClaudeBot, PerplexityBot),
  while human visitors see the site completely unchanged.
- **Layer 3 — Act** *(future)*: once a site's structure is clean and scored, agents can
  transact against it directly — semantic "buy," "book," "subscribe" — instead of
  scraping pixels.

*Speaker note: this mirrors how SEO evolved — first you measure (Lighthouse/ReadScore),
then you optimize (meta tags/Serve), then the ecosystem builds automation on top (Act).*

---

## 5. Product Demo (what exists right now)

- **Public ReadScan** — paste any URL, get a live 0–100 score and flags, no login required.
- **Playground** — full Read API access: real Markdown output, token/payload reduction stats,
  latency, cache state.
- **Dashboard** — sign in with Google (or email magic link), see your own read history,
  issue and revoke API keys — all backed by a real Postgres database (Supabase) with
  row-level security (each user only ever sees their own data).
- **Docs** — the ReadScore formula is published in full; nothing is hidden.

*Speaker note: stress that auth, database, and the scoring engine are wired end-to-end —
this is the actual product, running, not slides describing a future product.*

---

## 6. Market Timing — Why Now

- AI agent web traffic is growing fast; every major lab now ships a browsing/agent tool
  (OpenAI, Anthropic, Google, Perplexity).
- **Cloudflare** (Feb 2026) reported native HTML→Markdown conversion at the edge in
  under 15 ms — validating that the *conversion* problem is becoming table stakes.
- **Vercel** (Feb 2026) reported ~99% payload reduction serving Markdown to agents from
  their own edge — validating the *Serve* layer specifically.
- **Y Combinator** issued a Summer 2026 RFS explicitly calling for agent-economy
  infrastructure.
- The `llms.txt` convention is emerging organically (analogous to `robots.txt` in 1994) —
  early, unstandardized, and nobody yet owns the tooling around it.

*Speaker note: the honest framing is "early, not obvious yet" — that's the opportunity
and the risk in the same sentence. Say both.*

---

## 7. Competitive Landscape

| | AgentRead | Firecrawl | Browserbase | Cloudflare/Vercel |
|---|---|---|---|---|
| Clean HTML → Markdown | ✅ | ✅ (145K+ GitHub stars, funded) | — | edge-native, partial |
| Explainable readability score | ✅ | — | — | — |
| Hallucination risk flags | ✅ | — | — | — |
| Serve *your own* site to agents | roadmap | — | — | infra-level only |
| Browser action / "Act" | roadmap | partial | ✅ | — |

**Honest read:** Firecrawl already owns the "read someone else's site" wedge, with funding
and scale AgentRead does not have. The differentiated, defensible bet is **Layer 2 (Serve)**
and the **ReadScore standard** — becoming "the Lighthouse of agent readability" — not
out-scraping an incumbent scraper.

*Speaker note: naming Firecrawl unprompted builds credibility. Investors will ask "why not
Firecrawl" regardless — answering it before they ask is stronger than being caught unprepared.*

---

## 8. Business Model

- **Free** — 1,000 reads/month, full ReadScore + flags, community support.
- **Read API** — usage-based, pay per read, volume discounts.
- **SDK + Control Plane** (target: $99/mo founding rate, locked for early adopters) —
  the Serve middleware, ReadScore monitoring/alerts, and (planned) agent-traffic analytics.
- **Enterprise** — custom: dedicated regions, SSO/audit logs, pay-per-crawl monetization
  for large publishers (charge unverified AI crawlers per read instead of giving away content).

*Speaker note: pay-per-crawl is the most speculative and most interesting long-term
revenue line — it reframes "AI scraped my content for free" into a billable API.*

---

## 9. Go-To-Market

1. **ReadScan as the growth loop** — every free scan produces a shareable "your site
   scores 41/100" result; this is the same mechanic that made Lighthouse and
   similarly-shaped free-audit tools spread organically through developer Twitter/X.
2. **Launch channels**: Show HN, Product Hunt, r/webdev, X/dev-tool community, Indie Hackers.
3. **Content**: publish the ReadScore methodology openly (already done — see `/docs`) to
   build authority as the neutral standard, not just a vendor.
4. **Bottom-up**: target individual developers building agents first (low-friction, self-serve,
   free tier); the Serve/middleware sale to site owners comes second, once the score exists
   as social proof ("your site scored 41 — here's the one-line fix").

*Speaker note: the free tool generating leads for the paid tool is the whole GTM engine —
without it, this is just another API with no distribution.*

---

## 10. Traction Plan (First 90 Days)

*Fill this slide in with real numbers as they come in — leave it as a template until then.*

- Week 1–2: deploy live, submit to Show HN / Product Hunt.
- Week 2–4: X posts per >100 ReadScan results run; track scan count, waitlist signups.
- Month 2: reach out to 20 developers building agents for direct feedback; ship
  bearer-auth on the API + first MCP tool (`read_url`).
- Month 3: apply to incubators with real usage numbers (scans run, signups, any paying
  pilot customer) rather than a projection-only deck.

*Speaker note: incubators consistently respond better to "here is our graph after 60 days"
than to a idea-stage pitch — this section exists to be filled with real data before applying.*

---

## 11. Risks (say these before they're asked)

- **Thin technical moat** — the core extraction pipeline (Readability + Turndown) is
  open-source and replicable in a weekend. The defensibility has to come from the
  **ReadScore standard**, the **Serve distribution**, and being first to a trusted brand
  in this specific niche — not from the extraction code itself.
- **Platform risk** — if Cloudflare or Vercel ship "Serve" as a free edge checkbox,
  that layer of the business could be commoditized. Mitigation: focus differentiation on
  the score/flags layer and on multi-cloud/any-host support they won't prioritize.
- **Unproven willingness to pay** — no one has yet proven site owners will pay $99/mo to
  be "agent-readable." This is the single most important thing to validate in the first
  90 days, before assuming the business model.

*Speaker note: naming your own risks unprompted is consistently rated as a credibility
signal by early-stage investors — it reads as founder maturity, not weakness.*

---

## 12. Roadmap

- ✅ Read API + ReadScore engine (live)
- ✅ Google/email auth, dashboard, API key management (live)
- ⏳ Bearer-token auth enforcement on the public API
- ⏳ MCP server (`read_url`, `score_url`, `batch`, `map_site`, `extract_data`)
- ⏳ Serve middleware for Next.js (Layer 2)
- ⏳ Crawl, Watch (change detection), llms.txt Studio, agent-traffic analytics
- ⏳ Pay-per-crawl monetization for publishers
- 🔭 Act layer — semantic agent transactions (long-term)

---

## 13. The Ask

*Customize this slide per the specific incubator/investor:*

- What you're raising / what incubator track you're applying to
- What the funds or program unlock (e.g., 90 days full-time, first hire, compute for
  the MCP server + Serve middleware build)
- What "success" looks like at the end of that period (usage numbers, first paying
  customer, YC/Antler demo day)

---

## Appendix: Naming Rationale

The product is named **AgentRead** rather than continuing under an earlier working name
("Onto," borrowed from a reference product) or an unrelated code word ("Pith" — rejected
after search confirmed an existing AI-agent-memory company already uses it). AgentRead was
checked for collisions and is currently clear across company names, GitHub projects, and
common domains. Brand family: **ReadScore** (the metric), **ReadScan** (the free tool),
**AR+** (extended/paid feature tier).

## Appendix: Technical Honesty Statement

Everything marked "live" or "real" in this document is genuinely implemented and runnable
in this repository — not simulated data. Everything marked "roadmap" is explicitly not yet
built. This distinction is deliberate: incubators and technical diligence calls will check,
and the gap between "demo" and "real product" is exactly where founder credibility is won
or lost.
