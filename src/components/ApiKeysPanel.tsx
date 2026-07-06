"use client";

import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "@/app/dashboard/keys/actions";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export default function ApiKeysPanel({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const full = await createApiKey(name || "default");
      setNewKey(full);
      setName("");
      setKeys((k) => [
        {
          id: crypto.randomUUID(),
          name: name || "default",
          key_prefix: full.slice(0, 12) + "…",
          created_at: new Date().toISOString(),
          last_used_at: null,
          revoked: false,
        },
        ...k,
      ]);
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeApiKey(id);
      setKeys((k) => k.map((key) => (key.id === id ? { ...key, revoked: true } : key)));
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-semibold">API keys</h2>

      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="key name (optional)"
          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-violet-400"
        />
        <button
          disabled={pending}
          className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          New key
        </button>
      </form>

      {newKey && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
          <p className="font-semibold text-emerald-400">Copy this now — it won&apos;t be shown again:</p>
          <code className="mt-1 block break-all font-[family-name:var(--font-mono)] text-neutral-200">{newKey}</code>
        </div>
      )}

      <ul className="mt-4 divide-y divide-white/5">
        {keys.length === 0 && <p className="py-4 text-sm text-neutral-500">No API keys yet.</p>}
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium">{k.name}</p>
              <p className="font-[family-name:var(--font-mono)] text-xs text-neutral-500">{k.key_prefix}</p>
            </div>
            {k.revoked ? (
              <span className="text-xs text-neutral-500">revoked</span>
            ) : (
              <button
                onClick={() => handleRevoke(k.id)}
                disabled={pending}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
