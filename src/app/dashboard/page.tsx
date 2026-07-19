import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApiKeysPanel from "@/components/ApiKeysPanel";
import ReadsChart from "@/components/site/ReadsChart";

// A Supabase connection failure is treated the same as "not signed in" — a redirect to
// /login, never a hard crash on an authenticated-only page.
async function resolveSession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user };
  } catch (err) {
    console.error("[dashboard] failed to resolve auth session:", err);
    return { supabase: null, user: null };
  }
}

export default async function DashboardPage() {
  // Belt-and-suspenders: proxy.ts already gates /dashboard, but every server
  // entry point re-checks auth itself per Next.js's own guidance — a matcher
  // change in proxy.ts should never silently expose this page.
  const { supabase, user } = await resolveSession();

  if (!user || !supabase) {
    redirect("/login?next=/dashboard");
  }

  const { data: reads } = await supabase
    .from("reads")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, created_at, last_used_at, revoked")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const totalReads = reads?.length ?? 0;
  const avgScore = totalReads
    ? Math.round(reads!.reduce((s, r) => s + (r.read_score ?? 0), 0) / totalReads)
    : 0;
  const tokensSaved = reads
    ? reads.reduce((s, r) => s + Math.max(0, (r.tokens_before ?? 0) - (r.tokens_after ?? 0)), 0)
    : 0;
  const cacheHits = reads ? reads.filter((r) => r.cache_state === "HIT").length : 0;
  const cacheHitRate = totalReads ? Math.round((cacheHits / totalReads) * 100) : 0;

  return (
    <div className="dash-layout">
      <aside className="dash-side">
        <div className="side-group">
          <div className="side-title">Project</div>
          <a className="side-link active" href="/dashboard">
            <SideIcon d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
            Overview
          </a>
          <span className="side-link roadmap">
            <SideIcon d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
            Agent analytics
            <span className="side-soon">soon</span>
          </span>
        </div>
        <div className="side-group">
          <div className="side-title">Product</div>
          <span className="side-link active">
            <SideIcon d="M14 7h4a2 2 0 0 1 0 10h-4M10 7H6a2 2 0 0 0 0 10h4M8 12h8" />
            Read API keys
          </span>
          <span className="side-link roadmap">
            <SideIcon d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
            Watch alerts
            <span className="side-soon">soon</span>
          </span>
          <span className="side-link roadmap">
            <SideIcon d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
            llms.txt Studio
            <span className="side-soon">soon</span>
          </span>
        </div>
        <div className="side-group">
          <div className="side-title">Account</div>
          <span className="side-link roadmap">
            <SideIcon d="M2.5 5h19v14h-19zM2.5 10h19" />
            Billing
            <span className="side-soon">soon</span>
          </span>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Overview</h1>
            <p className="sub">{user.email} · real Supabase data, not a demo</p>
          </div>
          <a className="btn btn-primary btn-sm magnetic" href="/playground">
            Run a read →
          </a>
        </div>

        <div className="kpis">
          <div className="kpi glass">
            <div className="stat-label">Total reads</div>
            <div className="stat-value">{totalReads.toLocaleString()}</div>
            <div className="stat-sub">last 50 shown below</div>
          </div>
          <div className="kpi glass">
            <div className="stat-label">Avg ReadScore</div>
            <div className="stat-value">{totalReads ? `${avgScore}` : "—"}
              {totalReads > 0 && <span className="unit"> /100</span>}
            </div>
            <div className="stat-sub">{totalReads ? "across your reads" : "no reads yet"}</div>
          </div>
          <div className="kpi glass">
            <div className="stat-label">Tokens saved</div>
            <div className="stat-value">{tokensSaved.toLocaleString()}</div>
            <div className="stat-sub">raw HTML tokens avoided</div>
          </div>
          <div className="kpi glass">
            <div className="stat-label">Cache hit rate</div>
            <div className="stat-value">{totalReads ? `${cacheHitRate}%` : "—"}</div>
            <div className="meter">
              <div className="meter-fill" style={{ width: `${cacheHitRate}%` }} />
            </div>
          </div>
        </div>

        <section className="panel glass">
          <div className="panel-head">
            <div>
              <h2>Reads, last 14 days</h2>
              <p className="hint">your own reads, real data</p>
            </div>
          </div>
          {totalReads > 0 ? <ReadsChart reads={reads!} /> : <p className="empty-note">No reads yet — run one from the Playground to see it here.</p>}
        </section>

        <div style={{ marginBottom: 20 }}>
          <ApiKeysPanel initialKeys={keys ?? []} />
        </div>

        <section className="panel glass">
          <div className="panel-head">
            <h2>Recent reads</h2>
            <span className="hint">last {Math.min(totalReads, 50)}</span>
          </div>
          {!reads || reads.length === 0 ? (
            <p className="empty-note">
              No reads yet — run one from the <a href="/playground" style={{ color: "var(--accent-strong)" }}>playground</a> while signed in.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Score</th>
                    <th>Risk</th>
                    <th>Latency</th>
                    <th>Cache</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {reads.map((r) => (
                    <tr key={r.id}>
                      <td className="mono" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.url}
                      </td>
                      <td>{r.read_score}</td>
                      <td>
                        <span
                          className={`pill ${
                            r.hallucination_risk === "low"
                              ? "pill-good"
                              : r.hallucination_risk === "medium"
                              ? "pill-warn"
                              : "pill-serious"
                          }`}
                        >
                          {r.hallucination_risk}
                        </span>
                      </td>
                      <td className="mono">{r.latency_ms} ms</td>
                      <td className="mono">{r.cache_state}</td>
                      <td style={{ color: "var(--muted)" }}>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SideIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
}
