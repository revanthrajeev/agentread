"use client";

import { useState } from "react";

export interface WatchItem {
  id: string;
  root_url: string;
  host: string;
  frequency: string;
  pages: number;
  alert_email: string | null;
  webhook_url: string | null;
  alert_threshold: number;
  last_run_at: string | null;
  last_score: number | null;
}

export default function WatchManager({
  initial,
  canWatch,
  maxPages,
  allowsDaily,
}: {
  initial: WatchItem[];
  canWatch: boolean;
  maxPages: number;
  allowsDaily: boolean;
}) {
  const [watches, setWatches] = useState(initial);
  const [url, setUrl] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [threshold, setThreshold] = useState(5);
  const [email, setEmail] = useState("");
  const [webhook, setWebhook] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/watches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          frequency,
          pages: Math.min(10, maxPages),
          alert_threshold: threshold,
          alert_email: email.trim() || null,
          webhook_url: webhook.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create the monitor.");
        return;
      }

      setWatches((w) => [data.watch, ...w]);
      setUrl("");
      setEmail("");
      setWebhook("");
      if (data.frequency_adjusted) {
        setNotice("Daily checks need the Scale plan — this monitor was set to weekly.");
      }
    } catch {
      setError("Network error — the monitor was not created.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const previous = watches;
    setWatches((w) => w.filter((x) => x.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/watches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) setWatches(previous);
    } catch {
      setWatches(previous);
    }
  }

  return (
    <>
      <section className="panel glass" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <h2>New monitor</h2>
            <p className="hint">
              Re-audits on a schedule and alerts you when the score drops — the deploy that broke
              agent readability is the one nobody notices.
            </p>
          </div>
        </div>

        {!canWatch ? (
          <p className="empty-note">
            Scheduled monitoring is a paid feature.{" "}
            <a href="/pricing" style={{ color: "var(--accent-strong)" }}>
              Upgrade to Pro
            </a>{" "}
            to watch a site.
          </p>
        ) : (
          <form onSubmit={add} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className="scan-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yoursite.com"
                aria-label="Site to monitor"
                disabled={busy}
                style={{ flex: "1 1 240px" }}
              />
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
                disabled={busy}
                aria-label="Check frequency"
                style={selectStyle}
              >
                <option value="weekly">Weekly</option>
                <option value="daily">Daily{allowsDaily ? "" : " (Scale)"}</option>
              </select>
              <label className="hint" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                alert on −
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value) || 5)}
                  disabled={busy}
                  style={{ ...selectStyle, width: 70 }}
                />
                pts
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                className="scan-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alert email (optional)"
                aria-label="Alert email"
                disabled={busy}
                style={{ flex: "1 1 220px" }}
              />
              <input
                className="scan-input"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="webhook URL (optional)"
                aria-label="Alert webhook"
                disabled={busy}
                style={{ flex: "1 1 220px" }}
              />
              <button className="btn btn-primary" type="submit" disabled={busy || !url.trim()}>
                {busy ? "Adding…" : "Watch site"}
              </button>
            </div>
            {notice && <p className="hint" style={{ margin: 0 }}>{notice}</p>}
            {error && <p style={{ margin: 0, color: "var(--bad, #ef4444)", fontSize: 14 }}>{error}</p>}
          </form>
        )}
      </section>

      <section className="panel glass">
        <div className="panel-head">
          <h2>Active monitors</h2>
          <span className="hint">{watches.length}</span>
        </div>

        {watches.length === 0 ? (
          <p className="empty-note">No monitors yet.</p>
        ) : (
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Every</th>
                  <th>Last score</th>
                  <th>Last run</th>
                  <th>Alerts to</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {watches.map((w) => (
                  <tr key={w.id}>
                    <td className="mono">{w.host}</td>
                    <td>{w.frequency}</td>
                    <td className="mono">{w.last_score ?? "—"}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {w.last_run_at ? new Date(w.last_run_at).toLocaleString() : "pending"}
                    </td>
                    <td className="hint">
                      {[w.alert_email, w.webhook_url ? "webhook" : null].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => remove(w.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "inherit",
};
