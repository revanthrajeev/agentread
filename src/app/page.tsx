import Link from "next/link";
import ReadScanWidget from "@/components/ReadScanWidget";
import WaitlistForm from "@/components/WaitlistForm";

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-neutral-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live — real Read API, not a demo
        </span>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight sm:text-6xl">
          Agents can&apos;t read{" "}
          <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
            your website.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-400">
          AgentRead serves every AI agent clean, scored Markdown while humans see your site untouched.
          Same content, 100× fewer tokens, one line of code.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Get started free →
          </Link>
          <Link
            href="/playground"
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Try the Read API
          </Link>
        </div>
      </section>

      {/* LIVE READSCAN */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-2 text-center font-[family-name:var(--font-display)] text-2xl font-bold">
          How readable are you to agents? Find out for real.
        </h2>
        <p className="mb-6 text-center text-sm text-neutral-400">
          This box calls the live Read API — no demo data, no waitlist.
        </p>
        <ReadScanWidget />
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "Real extraction engine", d: "Mozilla Readability + Turndown running server-side — actual HTML fetched, actual Markdown produced." },
            { t: "Transparent ReadScore", d: "0–100, computed from explainable signals (payload reduction, script count, hydration risk) — never a black box." },
            { t: "Hallucination flags", d: "Prices in JS-only spans, disabled CTAs, missing llms.txt — flagged with real detection logic, per read." },
            { t: "MCP-ready", d: "Same engine will power read_url / score_url / batch tools for Claude Code, Cursor, and any MCP client." },
            { t: "Google sign-in", d: "Supabase-backed auth — sign in, get an API key, see your own read history in a real dashboard." },
            { t: "Free tier, no card", d: "Rate-limited playground access today; persisted history and API keys once you sign in." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-neutral-400">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WAITLIST */}
      <section className="mx-auto max-w-xl px-6 pb-28 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Building the Serve layer next.
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          One line of middleware that serves this same Markdown straight from your own site. Join the list.
        </p>
        <WaitlistForm />
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} AgentRead — early build. The Read API above is real; Serve/Act are in progress.
      </footer>
    </main>
  );
}
