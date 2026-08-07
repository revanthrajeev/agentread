"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Kicks off a site audit and routes to its report when it lands. */
export default function NewAuditForm({ maxPages }: { maxPages: number }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pages, setPages] = useState(Math.min(10, maxPages));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;

    setBusy(true);
    setError(null);
    setStatus(`Crawling up to ${pages} pages — a real crawl, this takes a moment…`);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), pages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Audit failed.");
        setStatus(null);
        return;
      }

      if (data.persisted && data.id) {
        router.push(`/dashboard/audits/${data.id}`);
        router.refresh();
      } else {
        // The crawl worked but the row didn't save — say so instead of a dead redirect.
        setStatus(null);
        setError(
          `Crawled ${data.pages_crawled} pages on ${data.host} (avg score ${data.avg_score}), but the result could not be saved. Check the Supabase connection.`
        );
      }
    } catch {
      setError("Network error — the audit did not complete.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="scan-form" style={{ flexWrap: "wrap", gap: 10 }}>
      <input
        className="scan-input"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="yoursite.com"
        aria-label="Site to audit"
        disabled={busy}
        style={{ flex: "1 1 260px" }}
      />
      <label className="hint" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        pages
        <input
          type="number"
          min={1}
          max={maxPages}
          value={pages}
          onChange={(e) => setPages(Math.max(1, Math.min(Number(e.target.value) || 1, maxPages)))}
          disabled={busy}
          style={{
            width: 72,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "inherit",
          }}
        />
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy || !url.trim()}>
        {busy ? "Auditing…" : "Run audit"}
      </button>

      {status && (
        <p className="hint" style={{ flexBasis: "100%", margin: 0 }}>
          {status}
        </p>
      )}
      {error && (
        <p style={{ flexBasis: "100%", margin: 0, color: "var(--bad, #ef4444)", fontSize: 14 }}>
          {error}
        </p>
      )}
      <p className="hint" style={{ flexBasis: "100%", margin: 0, opacity: 0.7 }}>
        Your plan allows up to {maxPages} pages per audit.
      </p>
    </form>
  );
}
