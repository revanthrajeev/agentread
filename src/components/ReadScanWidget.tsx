"use client";

import { useState } from "react";

interface ScanResult {
  url: string;
  title: string;
  readScore: number;
  hallucinationRisk: "low" | "medium" | "high";
  flags: { severity: string; text: string }[];
  htmlBytes: number;
  markdownBytes: number;
  tokensBefore: number;
  tokensAfter: number;
  latencyMs: number;
}

export default function ReadScanWidget() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  const statusColor =
    result && result.readScore >= 75
      ? "text-emerald-400"
      : result && result.readScore >= 55
      ? "text-amber-400"
      : "text-orange-400";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
      <form onSubmit={runScan} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yoursite.com"
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-violet-400"
        />
        <button
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Run ReadScan"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-5 text-center">
            <p className="text-xs text-neutral-400">ReadScore</p>
            <p className={`mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold ${statusColor}`}>
              {result.readScore}
              <span className="text-lg text-neutral-500"> /100</span>
            </p>
            <p className={`mt-2 text-sm font-medium ${statusColor}`}>
              {result.hallucinationRisk === "low"
                ? "✓ agent-ready"
                : result.hallucinationRisk === "medium"
                ? "◮ needs work"
                : "▲ at risk"}
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              {(result.htmlBytes / 1024).toFixed(0)} KB → {(result.markdownBytes / 1024).toFixed(1)} KB ·{" "}
              {result.latencyMs} ms
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <p className="mb-3 text-xs font-semibold text-neutral-400">
              {result.flags.length} signal{result.flags.length !== 1 ? "s" : ""} detected
            </p>
            <ul className="space-y-2 text-xs">
              {result.flags.slice(0, 5).map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-bold uppercase tracking-wide ${
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
      )}
    </div>
  );
}
