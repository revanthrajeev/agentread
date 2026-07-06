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
3. Create `.env.local` in the project root (copy `.env.local.example`) and paste both values in.
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

## 4. Deploy (Vercel — free)

1. [vercel.com/new](https://vercel.com/new) → import your GitHub repo.
2. In **Environment Variables**, add the same three from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` → set this to your real Vercel URL, e.g. `https://agentread.vercel.app`
3. Deploy.
4. Back in Supabase **Authentication → URL Configuration**, add your production URL to both
   Site URL and Redirect URLs (`https://yourdomain.com/auth/callback`).
5. Back in Google Cloud Console, add the production callback URL to the OAuth client's
   Authorized redirect URIs too (Supabase's callback URL doesn't change, so this step is
   usually already done — but double check).

---

## 5. Buy the domain (optional but recommended before publicizing)

Register `agentread.dev` (or `.com`/`.ai`) — Vercel lets you attach a custom domain for free
once purchased through any registrar (Namecheap, Porkbun, Google Domains successor Squarespace).
Point its DNS at Vercel per their dashboard instructions, then update
`NEXT_PUBLIC_SITE_URL` + the Supabase/Google redirect URLs to match.

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
| Bearer-auth on the public API | ⏳ keys are issued but not yet enforced on `/api/read` — see PROJECT.md roadmap |
| MCP server | ⏳ not built yet — the engine (`src/lib/engine/read.ts`) is ready to wrap |
| Serve middleware (Layer 2) | ⏳ not built yet |
| Billing / Stripe | ⏳ not built yet |

Everything marked ✅ is genuinely functional right now, not simulated.
