import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanForUser } from "@/lib/billing/usage";
import DashSidebar from "@/components/dash/DashSidebar";
import WatchManager, { type WatchItem } from "@/components/dash/WatchManager";

export default async function WatchPage() {
  const supabase = await createClient().catch(() => null);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/dashboard/watch");

  const [{ data: watches }, { data: events }, plan] = await Promise.all([
    supabase.from("watches").select("*").order("created_at", { ascending: false }),
    supabase
      .from("watch_events")
      .select("id, score, previous_score, delta, alerted, note, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    getPlanForUser(user.id),
  ]);

  return (
    <div className="dash-layout">
      <DashSidebar active="watch" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Watch alerts</h1>
            <p className="sub">
              Scheduled re-audits with regression detection — {plan.name} plan allows{" "}
              {plan.limits.watches === 0 ? "no" : plan.limits.watches} monitors.
            </p>
          </div>
        </div>

        <WatchManager
          initial={(watches ?? []) as WatchItem[]}
          canWatch={plan.limits.watches > 0}
          maxPages={plan.limits.pagesPerAudit}
          allowsDaily={plan.id === "scale" || plan.id === "enterprise"}
        />

        <section className="panel glass" style={{ marginTop: 20 }}>
          <div className="panel-head">
            <h2>Recent checks</h2>
            <span className="hint">score history and alerts</span>
          </div>
          {!events || events.length === 0 ? (
            <p className="empty-note">
              No checks have run yet. Monitors are executed by the scheduler hitting{" "}
              <span className="mono">/api/cron/watch</span>.
            </p>
          ) : (
            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Score</th>
                    <th>Change</th>
                    <th>Alerted</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color: "var(--muted)" }}>{new Date(e.created_at).toLocaleString()}</td>
                      <td className="mono">{e.score ?? "—"}</td>
                      <td className="mono">
                        {e.delta === null || e.delta === undefined ? (
                          "—"
                        ) : (
                          <span style={{ color: e.delta < 0 ? "var(--bad, #ef4444)" : "var(--good, #10b981)" }}>
                            {e.delta > 0 ? `+${e.delta}` : e.delta}
                          </span>
                        )}
                      </td>
                      <td>{e.alerted ? <span className="pill pill-serious">sent</span> : "—"}</td>
                      <td className="hint">{e.note ?? "—"}</td>
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
