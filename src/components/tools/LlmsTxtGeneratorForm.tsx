"use client";

import { useState } from "react";

interface Result {
  host: string;
  pagesCrawled: number;
  avgScore: number;
  llmsTxt: string;
  llmsFullTxt: string;
  capped: boolean;
}

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LlmsTxtGeneratorForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [variant, setVariant] = useState<"index" | "full">("index");
  const [copied, setCopied] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tools/llms-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  const active = result ? (variant === "full" ? result.llmsFullTxt : result.llmsTxt) : "";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
      <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
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
          {loading ? "Crawling…" : "Generate"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span>
              {result.host} — {result.pagesCrawled} page{result.pagesCrawled === 1 ? "" : "s"} crawled,
              avg ReadScore {result.avgScore}/100
            </span>
            {result.capped && <span className="text-amber-400">Capped at 8 pages — sign up for more.</span>}
          </div>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setVariant("index")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                variant === "index"
                  ? "border-violet-400/60 bg-violet-500/15 text-violet-200"
                  : "border-white/10 bg-white/[0.02] text-neutral-400"
              }`}
            >
              llms.txt
            </button>
            <button
              onClick={() => setVariant("full")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                variant === "full"
                  ? "border-violet-400/60 bg-violet-500/15 text-violet-200"
                  : "border-white/10 bg-white/[0.02] text-neutral-400"
              }`}
            >
              llms-full.txt
            </button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-neutral-300">
            {active}
          </pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(active);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-medium text-neutral-200"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => download(variant === "full" ? "llms-full.txt" : "llms.txt", active)}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-medium text-neutral-200"
            >
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
