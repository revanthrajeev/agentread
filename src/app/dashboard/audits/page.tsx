import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanForUser, getUsage } from "@/lib/billing/usage";
import { isUnlimited } from "@/lib/billing/plans";
import DashSidebar from "@/components/dash/DashSidebar";
import NewAuditForm from "@/components/dash/NewAuditForm";
import { scoreClass } from "@/lib/ui/score";

export default async function AuditsPage() {
  const supabase = await createClient().catch(() => null);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/dashboard/audits");

  const [{ data: audits }, plan, usage] = await Promise.all([
    supabase
      .from("audits")
      .select("id, root_url, host, avg_score, min_score, max_score, pages_crawled, discovery, has_llms_txt, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    getPlanForUser(user.id),
    getUsage(user.id),
  ]);

  const remaining = isUnlimited(plan.limits.audits)
    ? "unlimited"
    : `${Math.max(0, plan.limits.audits - usage.audits)} of ${plan.limits.audits}`;

  return (
    <div className="dash-layout">
      <DashSidebar active="audits" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Site audits</h1>
            <p className="sub">
              Crawl a whole site and score every page — {remaining} audits left this month on {plan.name}.
            </p>
          </div>
        </div>

        <section className="panel glass" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div>
              <h2>New audit</h2>
              <p className="hint">Discovers pages via llms.txt, then sitemap.xml, then on-page links.</p>
            </div>
          </div>
          <NewAuditForm maxPages={plan.limits.pagesPerAudit} />
        </section>

        <section className="panel glass">
          <div className="panel-head">
            <h2>History</h2>
            <span className="hint">{audits?.length ?? 0} audits</span>
          </div>

          {!audits || audits.length === 0 ? (
            <p className="empty-note">No audits yet — run one above to see your whole site scored.</p>
          ) : (
            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Avg score</th>
                    <th>Range</th>
                    <th>Pages</th>
                    <th>Discovery</th>
                    <th>llms.txt</th>
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
                      <td>
                        <span className={`pill ${scoreClass(a.avg_score)}`}>{a.avg_score ?? "—"}</span>
                      </td>
                      <td className="mono">
                        {a.min_score ?? "—"}–{a.max_score ?? "—"}
                      </td>
                      <td className="mono">{a.pages_crawled}</td>
                      <td className="mono">{a.discovery}</td>
                      <td>{a.has_llms_txt ? "yes" : "no"}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {new Date(a.created_at).toLocaleString()}
                      </td>
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
