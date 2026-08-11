import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApiKeysPanel from "@/components/ApiKeysPanel";
import ReadsChart from "@/components/site/ReadsChart";
import DashSidebar from "@/components/dash/DashSidebar";
import { getPlanForUser, getUsage } from "@/lib/billing/usage";
import { isUnlimited } from "@/lib/billing/plans";

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

  const { data: audits } = await supabase
    .from("audits")
    .select("id, host, avg_score, pages_crawled, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const [plan, usage] = await Promise.all([getPlanForUser(user.id), getUsage(user.id)]);
  const auditsLeft = isUnlimited(plan.limits.audits)
    ? "unlimited"
    : `${Math.max(0, plan.limits.audits - usage.audits)} left`;

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
      <DashSidebar active="overview" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Overview</h1>
            <p className="sub">
              {user.email} · {plan.name} plan · {auditsLeft} audits this month
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="btn btn-ghost btn-sm" href="/playground">
              Run a read
            </Link>
            <Link className="btn btn-primary btn-sm magnetic" href="/dashboard/audits">
              Audit a site →
            </Link>
          </div>
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

        <section className="panel glass" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div>
              <h2>Recent site audits</h2>
              <p className="hint">whole-site crawls, not single pages</p>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/dashboard/audits">
              All audits
            </Link>
          </div>
          {!audits || audits.length === 0 ? (
            <p className="empty-note">
              No site audits yet —{" "}
              <Link href="/dashboard/audits" style={{ color: "var(--accent-strong)" }}>
                run your first
              </Link>{" "}
              to see every page scored at once.
            </p>
          ) : (
            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Avg score</th>
                    <th>Pages</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/dashboard/audits/${a.id}`} style={{ color: "var(--accent-strong)" }}>
                          {a.host}
                        </Link>
                      </td>
                      <td className="mono">{a.avg_score}</td>
                      <td className="mono">{a.pages_crawled}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div id="keys" style={{ marginBottom: 20, scrollMarginTop: 90 }}>
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
