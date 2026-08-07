import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashSidebar from "@/components/dash/DashSidebar";
import GitHubConnect, { type Connection } from "@/components/dash/GitHubConnect";
import AutofixPanel from "@/components/dash/AutofixPanel";
import { isAutofixConfigured } from "@/lib/fix/llm";
import { isEncryptionConfigured } from "@/lib/crypto/secrets";
import { formatUsd } from "@/lib/fix/pricing";

export default async function AutofixPage() {
  const supabase = await createClient().catch(() => null);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) redirect("/login?next=/dashboard/autofix");

  const [{ data: connections }, { data: audits }, { data: profile }, { data: jobs }] =
    await Promise.all([
      supabase
        .from("github_connections")
        .select("id, owner, repo, default_branch, framework, token_hint, connected_at, last_used_at")
        .order("connected_at", { ascending: false }),
      supabase
        .from("audits")
        .select("id, host, avg_score, pages_crawled, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("profiles").select("autofix_credits").eq("id", user.id).maybeSingle(),
      supabase
        .from("fix_jobs")
        .select("id, host, status, fixes_applied, fixes_skipped, credits_consumed, pr_url, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const latestAudit = audits?.[0];
  const credits = profile?.autofix_credits ?? 0;
  const configured = isAutofixConfigured() && isEncryptionConfigured();

  return (
    <div className="dash-layout">
      <DashSidebar active="autofix" />

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Autofix</h1>
            <p className="sub">
              Turns audit findings into a reviewed pull request · {credits} credit
              {credits === 1 ? "" : "s"} remaining
            </p>
          </div>
        </div>

        {!configured && (
          <section className="panel glass" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <h2>Not configured on this deployment</h2>
            </div>
            <p className="hint" style={{ lineHeight: 1.8 }}>
              Autofix needs <span className="mono">ANTHROPIC_API_KEY</span> (to generate code fixes)
              and <span className="mono">SECRETS_ENCRYPTION_KEY</span> (to encrypt GitHub tokens
              before storing them). Deterministic fixes — llms.txt, robots.txt, the Serve middleware
              — work without the first; nothing works without the second, because storing a push
              token unencrypted is not something this app will do.
            </p>
          </section>
        )}

        <GitHubConnect initial={(connections ?? []) as Connection[]} />

        {!latestAudit ? (
          <section className="panel glass">
            <p className="empty-note">
              Run a{" "}
              <Link href="/dashboard/audits" style={{ color: "var(--accent-strong)" }}>
                site audit
              </Link>{" "}
              first — Autofix works from real findings, so there&rsquo;s nothing to fix until
              something has been scored.
            </p>
          </section>
        ) : (
          <>
            <p className="hint" style={{ marginBottom: 12 }}>
              Fixing <strong>{latestAudit.host}</strong> — {latestAudit.pages_crawled} pages, average
              score {latestAudit.avg_score}/100.{" "}
              <Link href="/dashboard/audits" style={{ color: "var(--accent-strong)" }}>
                Use a different audit
              </Link>
            </p>
            <AutofixPanel
              auditId={latestAudit.id}
              hasConnection={(connections?.length ?? 0) > 0}
              credits={credits}
            />
          </>
        )}

        <section className="panel glass">
          <div className="panel-head">
            <h2>Recent runs</h2>
          </div>
          {!jobs || jobs.length === 0 ? (
            <p className="empty-note">No Autofix runs yet.</p>
          ) : (
            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Applied</th>
                    <th>Skipped</th>
                    <th>Credits</th>
                    <th>PR</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td className="mono">{j.host}</td>
                      <td className="mono">{j.fixes_applied}</td>
                      <td className="mono">{j.fixes_skipped}</td>
                      <td className="mono">{j.credits_consumed}</td>
                      <td>
                        {j.pr_url ? (
                          <a href={j.pr_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-strong)" }}>
                            open ↗
                          </a>
                        ) : (
                          <span className="hint">{j.status}</span>
                        )}
                      </td>
                      <td style={{ color: "var(--muted)" }}>
                        {new Date(j.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="hint" style={{ marginTop: 16 }}>
          Deterministic fixes (llms.txt, robots.txt, Serve middleware) are generated from data we
          already hold and never consume a credit. Only fixes that require reading and changing your
          source cost {formatUsd(3)} each.
        </p>
      </main>
    </div>
  );
}
