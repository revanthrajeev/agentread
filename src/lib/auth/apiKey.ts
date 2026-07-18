import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ApiKeyAuth {
  userId: string;
  keyId: string;
  plan: string;
}

/** Extracts a bearer token from an Authorization header, e.g. "Bearer sk-ar-...". */
export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Verifies a raw `sk-ar-...` API key against the api_keys table (sha-256 comparison —
 * plaintext keys are never stored, see createApiKey in dashboard/keys/actions.ts).
 * Returns null for missing, unknown, or revoked keys. Best-effort updates last_used_at.
 */
export async function verifyApiKey(rawKey: string): Promise<ApiKeyAuth | null> {
  if (!rawKey || !rawKey.startsWith("sk-ar-")) return null;

  const hash = createHash("sha256").update(rawKey).digest("hex");
  const admin = createAdminClient();

  const { data: key } = await admin
    .from("api_keys")
    .select("id, user_id, revoked")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!key || key.revoked) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", key.user_id)
    .maybeSingle();

  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(
      () => {},
      () => {} // best-effort — a failed timestamp update must never block auth
    );

  return { userId: key.user_id, keyId: key.id, plan: profile?.plan ?? "developer" };
}
