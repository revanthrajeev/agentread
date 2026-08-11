"use client";

import { useState } from "react";

/**
 * Generates llms.txt / llms-full.txt from a stored audit. Regeneration reads the persisted
 * page markdown rather than re-crawling, so it's instant and consumes no quota.
 */
export default function LlmsTxtPanel({ auditId, host }: { auditId: string; host: string }) {
  const [variant, setVariant] = useState<"index" | "full">("index");
  const [content, setContent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate(which: "index" | "full") {
    setBusy(true);
    setError(null);
    setVariant(which);
    try {
      const res = await fetch("/api/llms-txt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audit_id: auditId, variant: which }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }
      setContent(data.content);
    } catch {
      setError("Network error — could not generate the file.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = variant === "full" ? "llms-full.txt" : "llms.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="panel glass" style={{ marginBottom: 20 }}>
      <div className="panel-head">
        <div>
          <h2>llms.txt Studio</h2>
          <p className="hint">
            Generate the file agents look for on {host}. Drop it at <span className="mono">/llms.txt</span>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => generate("index")} disabled={busy}>
            {busy && variant === "index" ? "…" : "llms.txt"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => generate("full")} disabled={busy}>
            {busy && variant === "full" ? "…" : "llms-full.txt"}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "var(--bad, #ef4444)", fontSize: 14 }}>{error}</p>}

      {!content && !error && (
        <p className="empty-note">
          Pick a variant above. <span className="mono">llms-full.txt</span> concatenates every page&rsquo;s
          Markdown — it measures roughly twice the crawler traffic of the index file.
        </p>
      )}

      {content && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={download}>
              Download {variant === "full" ? "llms-full.txt" : "llms.txt"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
            <span className="hint" style={{ alignSelf: "center" }}>
              {(new Blob([content]).size / 1024).toFixed(1)} kB
            </span>
          </div>
          <pre
            className="mono"
            style={{
              maxHeight: 320,
              overflow: "auto",
              padding: 14,
              borderRadius: 10,
              border: "1px solid var(--border)",
              fontSize: 12.5,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {content}
          </pre>
        </>
      )}
    </section>
  );
}
