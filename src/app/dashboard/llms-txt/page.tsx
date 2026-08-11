import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashSidebar from "@/components/dash/DashSidebar";
import LlmsTxtPanel from "@/components/dash/LlmsTxtPanel";

export default async function LlmsTxtStudioPage() {
  const supabase = await createClient().catch(() => null);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/dashboard/llms-txt");

  // The Studio generates from an existing audit, so the most recent one is the default subject.
  const { data: audits } = await supabase
    .from("audits")
    .select("id, host, avg_score, pages_crawled, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const latest = audits?.[0];

  return (
    <div className="dash-layout">
      <DashSidebar active="llms" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>llms.txt Studio</h1>
            <p className="sub">
              Generate the machine-readable index agents look for, straight from a real crawl.
            </p>
          </div>
        </div>

        {!latest ? (
          <section className="panel glass">
            <p className="empty-note">
              Run a{" "}
              <Link href="/dashboard/audits" style={{ color: "var(--accent-strong)" }}>
                site audit
              </Link>{" "}
              first — the Studio builds llms.txt from the pages a crawl actually found, so there&rsquo;s
              nothing invented in the output.
            </p>
          </section>
        ) : (
          <>
            <section className="panel glass" style={{ marginBottom: 20 }}>
              <div className="panel-head">
                <div>
                  <h2>Source audit</h2>
                  <p className="hint">
                    {latest.host} · {latest.pages_crawled} pages · avg score {latest.avg_score} ·{" "}
                    {new Date(latest.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link className="btn btn-ghost btn-sm" href="/dashboard/audits">
                  Change
                </Link>
              </div>
              {audits.length > 1 && (
                <div className="table-wrap" style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Pages</th>
                        <th>Score</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {audits.slice(1).map((a) => (
                        <tr key={a.id}>
                          <td>{a.host}</td>
                          <td className="mono">{a.pages_crawled}</td>
                          <td className="mono">{a.avg_score}</td>
                          <td>
                            <Link href={`/dashboard/audits/${a.id}`} style={{ color: "var(--accent-strong)" }}>
                              Open →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <LlmsTxtPanel auditId={latest.id} host={latest.host} />

            <section className="panel glass">
              <div className="panel-head">
                <h2>How to install it</h2>
              </div>
              <ol className="hint" style={{ lineHeight: 2, paddingLeft: 18 }}>
                <li>
                  Download <span className="mono">llms.txt</span> above.
                </li>
                <li>
                  Serve it at <span className="mono">https://{latest.host}/llms.txt</span> — in Next.js,
                  drop it in <span className="mono">public/</span>.
                </li>
                <li>
                  Do the same for <span className="mono">llms-full.txt</span> if you want models to ingest
                  the whole site in one fetch.
                </li>
                <li>Re-run the audit — the &ldquo;No /llms.txt found&rdquo; deduction disappears.</li>
              </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
