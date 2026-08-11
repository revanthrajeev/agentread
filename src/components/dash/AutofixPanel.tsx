"use client";

import { useState } from "react";

interface PlanItem {
  issueKey: string;
  strategy: "deterministic" | "llm" | "advisory";
  severity: string;
  title: string;
  description: string;
  affectedUrls: string[];
}

interface Plan {
  host: string;
  items: PlanItem[];
  deterministicCount: number;
  llmCount: number;
  advisoryCount: number;
  estimatedCostUsd: number;
}

interface FixOutcome {
  issue_key: string;
  strategy: string;
  title: string;
  ok: boolean;
  files_changed: number;
  explanation: string;
  error?: string;
}

const STRATEGY_LABEL: Record<string, { label: string; pill: string; note: string }> = {
  deterministic: { label: "Free", pill: "pill-good", note: "generated — no credit" },
  llm: { label: "1 credit", pill: "pill-warn", note: "needs a code change" },
  advisory: { label: "Report only", pill: "", note: "no safe automated fix" },
};

export default function AutofixPanel({
  auditId,
  hasConnection,
  credits,
}: {
  auditId: string;
  hasConnection: boolean;
  credits: number;
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [outcomes, setOutcomes] = useState<FixOutcome[] | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"plan" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPlan() {
    setBusy("plan");
    setError(null);
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audit_id: auditId, plan_only: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not build a fix plan.");
        return;
      }
      setPlan(data.plan);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  async function run() {
    setBusy("run");
    setError(null);
    setOutcomes(null);
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audit_id: auditId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Autofix failed.");
        return;
      }
      setOutcomes(data.results ?? []);
      setPrUrl(data.pull_request?.url ?? null);
      if (data.error && !data.pull_request) setError(data.error);
    } catch {
      setError("Network error — the job may still be running.");
    } finally {
      setBusy(null);
    }
  }

  const enoughCredits = !plan || plan.llmCount === 0 || credits >= plan.llmCount;

  return (
    <section className="panel glass" style={{ marginBottom: 20 }}>
      <div className="panel-head">
        <div>
          <h2>Autofix</h2>
          <p className="hint">
            Opens a pull request that fixes what this audit found. Never pushes to your default
            branch — you review every change.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadPlan} disabled={busy !== null}>
          {busy === "plan" ? "Planning…" : plan ? "Re-plan" : "See what it would fix"}
        </button>
      </div>

      {error && <p style={{ color: "var(--bad, #ef4444)", fontSize: 14 }}>{error}</p>}

      {!plan && !error && (
        <p className="empty-note">
          Build a plan first — it&rsquo;s free and shows exactly which fixes are generated (no
          charge) versus which need a code change.
        </p>
      )}

      {plan && (
        <>
          <div className="kpis" style={{ marginBottom: 16 }}>
            <div className="kpi glass">
              <div className="stat-label">Free fixes</div>
              <div className="stat-value">{plan.deterministicCount}</div>
              <div className="stat-sub">generated, no credit</div>
            </div>
            <div className="kpi glass">
              <div className="stat-label">Code fixes</div>
              <div className="stat-value">{plan.llmCount}</div>
              <div className="stat-sub">
                {plan.llmCount} credit{plan.llmCount === 1 ? "" : "s"} · you have {credits}
              </div>
            </div>
            <div className="kpi glass">
              <div className="stat-label">Report only</div>
              <div className="stat-value">{plan.advisoryCount}</div>
              <div className="stat-sub">no safe automated fix</div>
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: "auto", marginBottom: 16 }}>
            <table className="data-table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>Fix</th>
                  <th>Cost</th>
                  <th>Pages</th>
                </tr>
              </thead>
              <tbody>
                {plan.items.map((item, i) => {
                  const s = STRATEGY_LABEL[item.strategy];
                  return (
                    <tr key={`${item.issueKey}-${i}`}>
                      <td>
                        <strong>{item.title}</strong>
                        <div className="hint">{item.description}</div>
                      </td>
                      <td>
                        <span className={`pill ${s.pill}`}>{s.label}</span>
                        <div className="hint">{s.note}</div>
                      </td>
                      <td className="mono">{item.affectedUrls.length || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!hasConnection ? (
            <p className="empty-note">
              Connect a GitHub repository below to open the pull request.
            </p>
          ) : !enoughCredits ? (
            <p className="empty-note">
              This job needs {plan.llmCount} credits and you have {credits}.{" "}
              <a href="/dashboard/billing" style={{ color: "var(--accent-strong)" }}>
                Top up
              </a>{" "}
              — or the {plan.deterministicCount} free fixes can still ship on their own.
            </p>
          ) : (
            <button className="btn btn-primary" onClick={run} disabled={busy !== null}>
              {busy === "run" ? "Fixing and opening PR…" : "Fix it and open a PR"}
            </button>
          )}
        </>
      )}

      {prUrl && (
        <div style={{ marginTop: 16 }}>
          <a className="btn btn-primary btn-sm" href={prUrl} target="_blank" rel="noreferrer">
            View pull request ↗
          </a>
        </div>
      )}

      {outcomes && outcomes.length > 0 && (
        <div className="table-wrap" style={{ overflowX: "auto", marginTop: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fix</th>
                <th>Result</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((o, i) => (
                <tr key={`${o.issue_key}-${i}`}>
                  <td>{o.title}</td>
                  <td>
                    {o.ok ? (
                      <span className="pill pill-good">applied</span>
                    ) : (
                      <>
                        <span className="pill pill-warn">skipped</span>
                        <div className="hint">{o.error}</div>
                      </>
                    )}
                  </td>
                  <td className="mono">{o.files_changed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
