import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApiKeysPanel from "@/components/ApiKeysPanel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: proxy.ts already gates /dashboard, but every server
  // entry point re-checks auth itself per Next.js's own guidance — a matcher
  // change in proxy.ts should never silently expose this page.
  if (!user) {
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

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-neutral-400">{user?.email}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Total reads" value={totalReads.toLocaleString()} />
        <Stat label="Avg ReadScore" value={totalReads ? `${avgScore}/100` : "—"} />
        <Stat label="Tokens saved" value={tokensSaved.toLocaleString()} />
      </div>

      <div className="mt-8">
        <ApiKeysPanel initialKeys={keys ?? []} />
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-4 font-semibold">Recent reads</h2>
        {!reads || reads.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No reads yet — run one from the{" "}
            <a href="/playground" className="text-violet-400 underline">
              playground
            </a>{" "}
            while signed in.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-neutral-500">
                  <th className="py-2 pr-4">URL</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Risk</th>
                  <th className="py-2 pr-4">Latency</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {reads.map((r) => (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="max-w-xs truncate py-2 pr-4 font-[family-name:var(--font-mono)] text-xs">{r.url}</td>
                    <td className="py-2 pr-4">{r.read_score}</td>
                    <td className="py-2 pr-4">{r.hallucination_risk}</td>
                    <td className="py-2 pr-4">{r.latency_ms} ms</td>
                    <td className="py-2 text-neutral-500">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">{value}</p>
    </div>
  );
}
