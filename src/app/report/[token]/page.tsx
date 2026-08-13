import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSharedAudit } from "@/lib/audit/store";
import { formatBytes, riskLabel, scoreClass } from "@/lib/ui/score";

/**
 * Public, unauthenticated audit report. This is the acquisition loop: an audit is worth
 * sending to a colleague, and the page that gets sent sells the product.
 */

interface IssueRow {
  text: string;
  severity: string;
  count: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await loadSharedAudit(token);
  if (!result) return { title: "Report not found — AgentRead" };

  return {
    title: `${result.audit.host} scores ${result.audit.avg_score}/100 for AI agents — AgentRead`,
    description: `${result.audit.pages_crawled} pages analysed. Average ReadScore ${result.audit.avg_score}/100.`,
  };
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await loadSharedAudit(token);
  if (!result) notFound();

  const { audit, pages, whiteLabelOrg } = result;
  const issues: IssueRow[] = Array.isArray(audit.top_issues) ? audit.top_issues : [];
  const reduction =
    Number(audit.total_html_bytes) > 0
      ? (1 - Number(audit.total_markdown_bytes) / Number(audit.total_html_bytes)) * 100
      : 0;

  return (
    <main className="container section">
      <div className="section-head">
        <div className="eyebrow">{whiteLabelOrg ? `Prepared by ${whiteLabelOrg}` : "Agent readability report"}</div>
        <h1 className="title">{audit.host}</h1>
        <p className="lead">
          {audit.pages_crawled} pages analysed on{" "}
          {new Date(audit.created_at).toLocaleDateString()} · discovered via {audit.discovery}
        </p>
      </div>

      <div className="kpis" style={{ marginBottom: 28 }}>
        <div className="kpi glass">
          <div className="stat-label">Average ReadScore</div>
          <div className="stat-value">
            {audit.avg_score}
            <span className="unit"> /100</span>
          </div>
          <div className="stat-sub">{riskLabel(audit.avg_score)} hallucination risk</div>
        </div>
        <div className="kpi glass">
          <div className="stat-label">Worst page</div>
          <div className="stat-value">{audit.min_score}</div>
          <div className="stat-sub">best scores {audit.max_score}</div>
        </div>
        <div className="kpi glass">
          <div className="stat-label">Payload reduction</div>
          <div className="stat-value">{reduction.toFixed(0)}%</div>
          <div className="stat-sub">
            {formatBytes(Number(audit.total_html_bytes))} → {formatBytes(Number(audit.total_markdown_bytes))}
          </div>
        </div>
        <div className="kpi glass">
          <div className="stat-label">llms.txt</div>
          <div className="stat-value">{audit.has_llms_txt ? "Found" : "Missing"}</div>
          <div className="stat-sub">
            {audit.has_llms_txt ? "agents have a map" : "agents have no sanctioned map"}
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <section className="panel glass" style={{ marginBottom: 24 }}>
          <div className="panel-head">
            <div>
              <h2>What&rsquo;s costing this site points</h2>
              <p className="hint">Rolled up across every crawled page.</p>
            </div>
          </div>
          <ul className="risk-list">
            {issues.map((issue, i) => (
              <li key={i} className="risk-item">
                <span
                  className={`pill ${
                    issue.severity === "high"
                      ? "pill-serious"
                      : issue.severity === "medium"
                      ? "pill-warn"
                      : "pill-good"
                  }`}
                >
                  {issue.severity}
                </span>
                <span style={{ marginLeft: 10 }}>{issue.text}</span>
                <span className="hint" style={{ marginLeft: 8 }}>
                  · {issue.count} page{issue.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel glass" style={{ marginBottom: 24 }}>
        <div className="panel-head">
          <h2>Page scores</h2>
          <span className="hint">worst first</span>
        </div>
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>Page</th>
                <th>Score</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.url}>
                  <td className="mono" style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {safePath(p.url)}
                  </td>
                  <td>
                    {p.ok ? (
                      <span className={`pill ${scoreClass(p.read_score)}`}>{p.read_score}</span>
                    ) : (
                      <span className="pill pill-serious">failed</span>
                    )}
                  </td>
                  <td className="mono">{p.ok ? p.hallucination_risk : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!whiteLabelOrg && (
        <section className="cta-final">
          <h2 className="title" style={{ fontSize: 28 }}>
            Run this on your own site
          </h2>
          <p className="lead">
            Free scan, no card. See exactly which pages an AI agent can&rsquo;t read — and generate the
            llms.txt that fixes it.
          </p>
          <div className="hero-cta-row">
            <Link className="btn btn-primary btn-lg" href="/">
              Scan my site
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/pricing">
              See pricing
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}
