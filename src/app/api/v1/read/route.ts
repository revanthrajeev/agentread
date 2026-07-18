import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";
import { extractBearerToken, verifyApiKey } from "@/lib/auth/apiKey";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The authenticated public Read API (Layer 1 in PROJECT.md) — this is the surface
 * developers/agents integrate against directly, distinct from the anonymous, IP-rate-limited
 * /api/read used by the in-browser Playground. Requires `Authorization: Bearer sk-ar-...`.
 */

const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60; // authenticated developer traffic gets a higher ceiling than the anon demo

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Authorization: Bearer sk-ar-..." },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(token);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  if (rateLimited(auth.keyId)) {
    return NextResponse.json(
      { error: `Rate limited — max ${MAX_PER_WINDOW} reads per minute per API key.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    const result = await readUrl(url, { fresh: !!body?.fresh });

    try {
      const admin = createAdminClient();
      await admin.from("reads").insert({
        user_id: auth.userId,
        url: result.url,
        agent: request.headers.get("user-agent")?.slice(0, 200) || "api",
        html_bytes: result.htmlBytes,
        markdown_bytes: result.markdownBytes,
        tokens_before: result.tokensBefore,
        tokens_after: result.tokensAfter,
        read_score: result.readScore,
        hallucination_risk: result.hallucinationRisk,
        flags: result.flags,
        latency_ms: result.latencyMs,
        cache_state: result.cache,
      });
    } catch {
      // persistence is best-effort; the read itself already succeeded
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
