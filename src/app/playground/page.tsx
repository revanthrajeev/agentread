"use client";

import { useState } from "react";

interface ReadResult {
  url: string;
  title: string;
  markdown: string;
  htmlBytes: number;
  markdownBytes: number;
  tokensBefore: number;
  tokensAfter: number;
  readScore: number;
  hallucinationRisk: "low" | "medium" | "high";
  flags: { severity: string; text: string }[];
  latencyMs: number;
  cache: "HIT" | "MISS";
}

export default function PlaygroundPage() {
  const [url, setUrl] = useState("https://en.wikipedia.org/wiki/Web_scraping");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [error, setError] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Read failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Read failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Playground</h1>
      <p className="mt-2 text-neutral-400">
        Real Read API call — enter any public URL. Rate-limited to 10 reads/min per IP; sign in to save history.
      </p>

      <form onSubmit={run} className="mt-6 flex gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-violet-400"
          placeholder="https://example.com"
        />
        <button
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Reading…" : "Read & score →"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between text-xs text-neutral-400">
              <span>OUTPUT MARKDOWN</span>
              <span>{(result.markdownBytes / 1024).toFixed(1)} KB · {result.cache}</span>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-[family-name:var(--font-mono)] text-xs text-neutral-300">
              {result.markdown}
            </pre>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-xs text-neutral-400">ReadScore</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold">
                {result.readScore}
                <span className="text-lg text-neutral-500"> /100</span>
              </p>
              <p className="mt-2 text-sm text-neutral-400">risk: {result.hallucinationRisk}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="HTML → MD" value={`${(result.htmlBytes / 1024).toFixed(0)}K → ${(result.markdownBytes / 1024).toFixed(1)}K`} />
              <Stat label="Tokens" value={`${result.tokensAfter.toLocaleString()}`} sub={`was ${result.tokensBefore.toLocaleString()}`} />
              <Stat label="Reduction" value={`${(100 - (result.markdownBytes / result.htmlBytes) * 100).toFixed(1)}%`} />
              <Stat label="Latency" value={`${result.latencyMs} ms`} />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-3 text-xs font-semibold text-neutral-400">
                {result.flags.length} signal{result.flags.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-2 text-xs">
                {result.flags.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-bold uppercase ${
                        f.severity === "high"
                          ? "bg-red-500/15 text-red-400"
                          : f.severity === "medium"
                          ? "bg-amber-500/15 text-amber-400"
                          : f.severity === "low"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {f.severity}
                    </span>
                    <span className="text-neutral-300">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}
