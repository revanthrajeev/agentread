import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgentTraffic } from "@/lib/analytics/agentHits";
import DashSidebar from "@/components/dash/DashSidebar";

/**
 * Agent analytics — server-side truth about which AI crawlers actually fetched the site.
 * The AI-visibility suites infer citation share from the outside; this is the request log.
 */
export default async function AnalyticsPage() {
  const supabase = await createClient().catch(() => null);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/dashboard/analytics");

  const traffic = await getAgentTraffic(user.id, 30);
  const peakDay = traffic.daily.reduce((max, d) => Math.max(max, d.hits), 0);

  return (
    <div className="dash-layout">
      <DashSidebar active="analytics" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Agent analytics</h1>
            <p className="sub">Which AI crawlers hit your site, and what they were served — last 30 days.</p>
          </div>
        </div>

        {traffic.totalHits === 0 ? (
          <section className="panel glass">
            <div className="panel-head">
              <h2>No agent traffic recorded yet</h2>
            </div>
            <p className="empty-note" style={{ lineHeight: 1.8 }}>
              This fills in once the Serve middleware is running on your site and an AI crawler
              requests a page. Install it, set <span className="mono">AGENTREAD_API_KEY</span> so hits are
              attributed to your account, and every GPTBot / ClaudeBot / PerplexityBot request shows up
              here with the score it was served.
            </p>
          </section>
        ) : (
          <>
            <div className="kpis">
              <div className="kpi glass">
                <div className="stat-label">Agent requests</div>
                <div className="stat-value">{traffic.totalHits.toLocaleString()}</div>
                <div className="stat-sub">last 30 days</div>
              </div>
              <div className="kpi glass">
                <div className="stat-label">Distinct crawlers</div>
                <div className="stat-value">{traffic.byCrawler.length}</div>
                <div className="stat-sub">{traffic.byCrawler[0]?.crawler ?? "—"} leads</div>
              </div>
              <div className="kpi glass">
                <div className="stat-label">Tokens saved</div>
                <div className="stat-value">{traffic.tokensSaved.toLocaleString()}</div>
                <div className="stat-sub">vs. serving raw HTML</div>
              </div>
              <div className="kpi glass">
                <div className="stat-label">Avg score served</div>
                <div className="stat-value">
                  {traffic.avgReadScore ?? "—"}
                  {traffic.avgReadScore !== null && <span className="unit"> /100</span>}
                </div>
                <div className="stat-sub">quality agents received</div>
              </div>
            </div>

            <section className="panel glass" style={{ marginBottom: 20 }}>
              <div className="panel-head">
                <h2>By crawler</h2>
                <span className="hint">share of agent traffic</span>
              </div>
              {traffic.byCrawler.map((c) => (
                <div className="cbar-row" key={c.crawler}>
                  <div className="cbar-head">
                    <span className="cbar-name">{c.crawler}</span>
                    <span className="cbar-val mono">{c.hits.toLocaleString()}</span>
                  </div>
                  <div className="cbar-track">
                    <div
                      className="cbar-fill"
                      style={{ width: `${Math.round((c.hits / traffic.totalHits) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </section>

            <section className="panel glass" style={{ marginBottom: 20 }}>
              <div className="panel-head">
                <h2>Daily requests</h2>
                <span className="hint">peak {peakDay}/day</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}>
                {traffic.daily.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.hits} requests`}
                    style={{
                      flex: 1,
                      minWidth: 4,
                      height: `${peakDay ? Math.max(4, (d.hits / peakDay) * 100) : 4}%`,
                      background: "var(--accent-strong)",
                      opacity: 0.75,
                      borderRadius: "3px 3px 0 0",
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="panel glass">
              <div className="panel-head">
                <h2>Most requested paths</h2>
                <span className="hint">what agents actually want</span>
              </div>
              <div className="table-wrap" style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Path</th>
                      <th>Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traffic.topPaths.map((p) => (
                      <tr key={p.path}>
                        <td className="mono">{p.path}</td>
                        <td className="mono">{p.hits.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
