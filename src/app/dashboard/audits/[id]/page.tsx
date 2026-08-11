import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashSidebar from "@/components/dash/DashSidebar";
import LlmsTxtPanel from "@/components/dash/LlmsTxtPanel";
import AutofixPanel from "@/components/dash/AutofixPanel";
import { formatBytes, riskLabel, scoreClass, severityClass } from "@/lib/ui/score";
import { siteUrl } from "@/lib/billing/stripe";

interface IssueRow {
  text: string;
  severity: string;
  count: number;
}

interface FlagRow {
  severity: string;
  text: string;
}

// Next.js 16: params is a Promise and must be awaited before use.
export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient().catch(() => null);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect(`/login?next=/dashboard/audits/${id}`);

  const { data: audit } = await supabase
    .from("audits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!audit) notFound();

  const [{ data: pages }, { data: share }, { data: connections }, { data: profile }] =
    await Promise.all([
      supabase
        .from("audit_pages")
        .select("url, title, read_score, hallucination_risk, html_bytes, markdown_bytes, flags, ok, error")
        .eq("audit_id", id)
        .order("read_score", { ascending: true }),
      supabase.from("audit_shares").select("token").eq("audit_id", id).maybeSingle(),
      supabase.from("github_connections").select("id").eq("active", true).limit(1),
      supabase.from("profiles").select("autofix_credits").eq("id", user.id).maybeSingle(),
    ]);

  const issues: IssueRow[] = Array.isArray(audit.top_issues) ? audit.top_issues : [];
  const reduction =
    audit.total_html_bytes > 0
      ? (1 - Number(audit.total_markdown_bytes) / Number(audit.total_html_bytes)) * 100
      : 0;
  const tokensSaved = Number(audit.tokens_before ?? 0) - Number(audit.tokens_after ?? 0);

  return (
    <div className="dash-layout">
      <DashSidebar active="audits" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>{audit.host}</h1>
            <p className="sub">
              <Link href="/dashboard/audits" style={{ color: "var(--accent-strong)" }}>
                ← All audits
              </Link>
              {" · "}
              {audit.pages_crawled} pages via {audit.discovery} ·{" "}
              {new Date(audit.created_at).toLocaleString()}
            </p>
          </div>
          {share?.token && (
            <a className="btn btn-ghost btn-sm" href={`/report/${share.token}`} target="_blank" rel="noreferrer">
              Public report ↗
            </a>
          )}
        </div>

        <div className="kpis">
          <div className="kpi glass">
            <div className="stat-label">Avg ReadScore</div>
            <div className="stat-value">
              {audit.avg_score}
              <span className="unit"> /100</span>
            </div>
            <div className="stat-sub">
              range {audit.min_score}–{audit.max_score} · {riskLabel(audit.avg_score)} risk
            </div>
          </div>
          <div className="kpi glass">
            <div className="stat-label">Payload reduction</div>
            <div className="stat-value">{reduction.toFixed(1)}%</div>
            <div className="stat-sub">
              {formatBytes(Number(audit.total_html_bytes))} → {formatBytes(Number(audit.total_markdown_bytes))}
            </div>
          </div>
          <div className="kpi glass">
            <div className="stat-label">Tokens saved</div>
            <div className="stat-value">{tokensSaved.toLocaleString()}</div>
            <div className="stat-sub">per full-site read</div>
          </div>
          <div className="kpi glass">
            <div className="stat-label">llms.txt</div>
            <div className="stat-value">{audit.has_llms_txt ? "Found" : "Missing"}</div>
            <div className="stat-sub">
              {audit.has_llms_txt ? "agents have a sanctioned map" : "generate one below"}
            </div>
          </div>
        </div>

        {issues.length > 0 && (
          <section className="panel glass" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <div>
                <h2>What to fix</h2>
                <p className="hint">Rolled up across every crawled page, worst first.</p>
              </div>
            </div>
            <ul className="risk-list">
              {issues.map((issue, i) => (
                <li key={i} className={`risk-item ${severityClass(issue.severity)}`}>
                  <span className={`pill ${issue.severity === "high" ? "pill-serious" : issue.severity === "medium" ? "pill-warn" : "pill-good"}`}>
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

        <AutofixPanel
          auditId={id}
          hasConnection={(connections?.length ?? 0) > 0}
          credits={profile?.autofix_credits ?? 0}
        />

        <LlmsTxtPanel auditId={id} host={audit.host} />

        <section className="panel glass">
          <div className="panel-head">
            <h2>Pages</h2>
            <span className="hint">worst score first</span>
          </div>
          <div className="table-wrap" style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Score</th>
                  <th>Risk</th>
                  <th>HTML</th>
                  <th>Markdown</th>
                  <th>Top issue</th>
                </tr>
              </thead>
              <tbody>
                {(pages ?? []).map((p) => {
                  const flags: FlagRow[] = Array.isArray(p.flags) ? p.flags : [];
                  const worst = flags.find((f) => f.severity === "high") ?? flags.find((f) => f.severity !== "ok");
                  return (
                    <tr key={p.url}>
                      <td style={{ maxWidth: 300 }}>
                        <a href={p.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-strong)" }}>
                          {new URL(p.url).pathname || "/"}
                        </a>
                        <div className="hint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.title}
                        </div>
                      </td>
                      <td>
                        {p.ok ? (
                          <span className={`pill ${scoreClass(p.read_score)}`}>{p.read_score}</span>
                        ) : (
                          <span className="pill pill-serious">failed</span>
                        )}
                      </td>
                      <td className="mono">{p.ok ? p.hallucination_risk : "—"}</td>
                      <td className="mono">{formatBytes(p.html_bytes ?? 0)}</td>
                      <td className="mono">{formatBytes(p.markdown_bytes ?? 0)}</td>
                      <td className="hint" style={{ maxWidth: 260 }}>
                        {p.ok ? worst?.text ?? "No issues" : p.error}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {share?.token && (
          <p className="hint" style={{ marginTop: 16 }}>
            Shareable report:{" "}
            <span className="mono">
              {siteUrl()}/report/{share.token}
            </span>
          </p>
        )}
      </main>
    </div>
  );
}
