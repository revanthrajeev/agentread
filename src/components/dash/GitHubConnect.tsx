"use client";

import { useState } from "react";

export interface Connection {
  id: string;
  owner: string;
  repo: string;
  default_branch: string | null;
  framework: string | null;
  token_hint: string | null;
  connected_at: string;
  last_used_at: string | null;
}

export default function GitHubConnect({ initial }: { initial: Connection[] }) {
  const [connections, setConnections] = useState(initial);
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!repo.trim() || !token.trim() || busy) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo: repo.trim(), token: token.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not connect the repository.");
        return;
      }

      setConnections((c) => [data.connection, ...c.filter((x) => x.id !== data.connection.id)]);
      setRepo("");
      setToken("");
      setNotice(
        `Connected. Detected ${data.framework} across ${data.files_indexed.toLocaleString()} files.`
      );
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(id: string) {
    const previous = connections;
    setConnections((c) => c.filter((x) => x.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/github/connect?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) setConnections(previous);
    } catch {
      setConnections(previous);
    }
  }

  return (
    <section className="panel glass" style={{ marginBottom: 20 }}>
      <div className="panel-head">
        <div>
          <h2>Connected repository</h2>
          <p className="hint">
            Autofix opens pull requests here. Your token is encrypted before it&rsquo;s stored and
            is only ever used to read files and open a PR.
          </p>
        </div>
      </div>

      <form onSubmit={connect} style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            className="scan-input"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            aria-label="Repository"
            disabled={busy}
            style={{ flex: "1 1 200px" }}
          />
          <input
            className="scan-input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="GitHub token with Contents: read & write"
            aria-label="GitHub token"
            disabled={busy}
            style={{ flex: "1 1 260px" }}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !repo.trim() || !token.trim()}>
            {busy ? "Verifying…" : "Connect"}
          </button>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          A fine-grained personal access token scoped to this one repository, with{" "}
          <span className="mono">Contents: Read and write</span> and{" "}
          <span className="mono">Pull requests: Read and write</span>. Nothing else is needed.
        </p>
        {notice && <p className="hint" style={{ margin: 0 }}>{notice}</p>}
        {error && <p style={{ margin: 0, color: "var(--bad, #ef4444)", fontSize: 14 }}>{error}</p>}
      </form>

      {connections.length === 0 ? (
        <p className="empty-note">No repository connected yet.</p>
      ) : (
        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>Branch</th>
                <th>Framework</th>
                <th>Token</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.id}>
                  <td className="mono">
                    {c.owner}/{c.repo}
                  </td>
                  <td className="mono">{c.default_branch ?? "—"}</td>
                  <td>{c.framework ?? "unknown"}</td>
                  <td className="mono">{c.token_hint ?? "—"}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => disconnect(c.id)}>
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
