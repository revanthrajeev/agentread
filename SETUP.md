# AgentRead — Setup Guide

This app is real, not a demo: `/api/read` and `/api/scan` actually fetch the URL you give them,
extract it with Mozilla Readability, convert it to Markdown, and compute a live ReadScore.
Nothing here is mocked. Follow these steps in order to get it fully running with login,
a database, and a public deployment.

Time required: ~20 minutes, all free tier.

---

## 1. Create a Supabase project (database + auth)

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is enough).
2. Once it's created, open **Project Settings → API**. Copy:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (also on this page, under "Project API keys") → this is
     `SUPABASE_SERVICE_ROLE_KEY`. **Server-only — never expose this to the browser.**
     It's what lets `/api/v1/read` and `/api/mcp` verify a bearer API key without a
     logged-in session (API-key callers have no Supabase cookie, so the normal
     row-level-security policies can't resolve `auth.uid()` for them).
3. Create `.env.local` in the project root (copy `.env.local.example`) and paste all three values in.
4. Open **SQL Editor** in Supabase → **New query** → paste the entire contents of
   `supabase/schema.sql` from this repo → **Run**. This creates:
   - `profiles` (auto-filled on signup, including from Google)
   - `api_keys` (hashed — plaintext keys are never stored)
   - `reads` (every scored read, powers the dashboard)
   - `waitlist` (public landing-page email capture)
5. Run `npm install && npm run dev`, open `http://localhost:3000/login`, and try
   **"Send magic link"** with your own email — this works immediately with zero
   further config, since it only needs Supabase. Click the emailed link — you should
   land on `/dashboard` signed in.

At this point: real auth, real database, real API — Google sign-in is the only piece left.

---

## 2. Add Google login

Google requires its own OAuth client; Supabase can't create one for you.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project (or reuse one).
2. **APIs & Services → OAuth consent screen** → External → fill in app name ("AgentRead"),
   your email, save. (You can leave it in "Testing" mode while building.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs — add the callback URL Supabase shows you in the next step
     (format: `https://<your-project-ref>.supabase.co/auth/v1/callback`)
4. Copy the generated **Client ID** and **Client Secret**.
5. In Supabase: **Authentication → Providers → Google** → toggle it on → paste the Client ID
   and Client Secret → **Save**.
6. In Supabase: **Authentication → URL Configuration** → set:
   - Site URL: `http://localhost:3000` while developing (switch to your real domain after deploying)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and later your production
     `https://yourdomain.com/auth/callback`

Reload `/login` — "Continue with Google" now works end-to-end.

---

## 3. Push to GitHub

```bash
cd agentread-app
git init                     # if not already a repo
git add .
git commit -m "Initial commit — AgentRead real MVP"
git branch -M main
git remote add origin <YOUR_EMPTY_GITHUB_REPO_URL>
git push -u origin main
```

`.env.local` is already in `.gitignore` — your real Supabase keys will never be committed.

---

## 4. Deploy (Vercel or Netlify — free)

Whichever platform you use, set environment variables in **that platform's own dashboard** —
they are never read from `.env.local` or from GitHub, so this step is required even though
the repo is already pushed.

1. Import your GitHub repo (Vercel: [vercel.com/new](https://vercel.com/new). Netlify:
   [app.netlify.com](https://app.netlify.com) → "Import an existing project").
2. Add these environment variables (same names as `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` → mark it **Sensitive**/secret in the dashboard
   - `NEXT_PUBLIC_SITE_URL` → your real deployed URL, e.g. `https://agentread.vercel.app`
     or `https://agentread.netlify.app`
   - `INTERNAL_SERVE_SECRET` → any long random string (e.g. `openssl rand -hex 32`), used
     only to authenticate proxy.ts's own server-to-server call to `/api/internal/serve`
     (see "Serve middleware architecture" below). If this is missing, Serve silently
     disables itself rather than breaking the site — crawlers just get the normal page.
3. Deploy.
4. Back in Supabase **Authentication → URL Configuration**, add your production URL to both
   Site URL and Redirect URLs (`https://yourdomain.com/auth/callback`).
5. Back in Google Cloud Console, add the production callback URL to the OAuth client's
   Authorized redirect URIs too (Supabase's callback URL doesn't change, so this step is
   usually already done — but double check).

### Serve middleware architecture (why there's an internal API route)

`src/proxy.ts` (Next.js Middleware) gets bundled as an **Edge Function** by both Vercel's and
Netlify's adapters. The Serve middleware's actual work — fetch, Mozilla Readability, Turndown
— depends on `jsdom`, which is Node-native and cannot run in that sandbox (this failed a real
Netlify build with `Failed to load external module jsdom`). So `proxy.ts` only does the cheap,
edge-safe part (User-Agent detection) and makes a network call to `/api/internal/serve` — a
normal Node.js-runtime route — which does the actual jsdom-based extraction. That route is
locked behind `INTERNAL_SERVE_SECRET` since it isn't part of the public API.

---

## 5. Buy the domain (optional but recommended before publicizing)

Register `agentread.dev` (or `.com`/`.ai`) — Vercel lets you attach a custom domain for free
once purchased through any registrar (Namecheap, Porkbun, Google Domains successor Squarespace).
Point its DNS at Vercel per their dashboard instructions, then update
`NEXT_PUBLIC_SITE_URL` + the Supabase/Google redirect URLs to match.

---

## 6. Test the Read API and MCP server

Once you're signed in on `/dashboard`, issue an API key there, then:

```bash
# REST API
curl -X POST http://localhost:3000/api/v1/read \
  -H "Authorization: Bearer sk-ar-..." \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# MCP server — point any MCP client (Claude, ChatGPT connectors, custom agents) at
# http://localhost:3000/api/mcp (or your deployed URL) with the same bearer token.
# tools/list should return read_url and score_url.
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer sk-ar-..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

Both endpoints return `401` with no token or an unrecognized/revoked one — that's the
bearer-auth enforcement, not a bug. The old `/api/read` and `/api/scan` stay intentionally
open (IP-rate-limited) since they power the public, no-login Playground and ReadScan widgets.

---

## What's real vs. what's next

| Piece | Status |
|---|---|
| Fetch → Readability → Markdown | ✅ real, runs server-side on every request |
| ReadScore heuristic + flags | ✅ real, transparent, documented in `/docs` |
| `/llms.txt` detection | ✅ real (live HEAD request) |
| Google + magic-link login | ✅ real via Supabase Auth |
| Dashboard (reads, stats) | ✅ real Supabase data, per-user, RLS-protected |
| API key issuance/revocation | ✅ real (hashed storage, shown once) |
| Bearer-auth on the public API (`/api/v1/read`) | ✅ real — requires `Authorization: Bearer sk-ar-...`, 401s otherwise, 60 req/min per key |
| MCP server (`/api/mcp`) | ✅ real — remote Streamable HTTP MCP server, `read_url` + `score_url` tools, same bearer-auth |
| Serve middleware (Layer 2) | ✅ real — `src/proxy.ts` detects known AI-crawler UAs and serves them real distilled Markdown; this site runs it on itself |
| Design system / 3D hero | ✅ real — glass-morphism UI + Three.js scroll-reactive canvas, merged in from the earlier static concept site (now retired) |
| Billing / Stripe | ⏳ not built yet |

Everything marked ✅ is genuinely functional right now, not simulated.

### Testing the Serve middleware locally

```bash
# human request — normal HTML
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3000/

# AI crawler — gets Markdown instead
curl -s -D - -o /dev/null -A "GPTBot/1.1" http://localhost:3000/ \
  | grep -i "x-agentread\|x-readscore\|content-type"
```
The crawler request should come back `content-type: text/markdown` with `x-readscore` and
`x-agentread-crawler` headers. If it doesn't, check that `src/proxy.ts` (not a root-level
`proxy.ts`) exists — Next.js silently ignores a `proxy.ts` at the repo root when the app
lives under `src/app`, which is exactly the bug this file used to have.
