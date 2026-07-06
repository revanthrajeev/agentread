import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";
import { createClient } from "@/lib/supabase/server";

// simple in-memory rate limit — good enough for a single-instance demo deploy;
// swap for Upstash/Redis before scaling past one server process.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

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
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limited — max 10 reads per minute on the free playground." },
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

    // best-effort persistence — only if the caller is logged in; never blocks the response
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("reads").insert({
          user_id: user.id,
          url: result.url,
          agent: "playground",
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
      }
    } catch {
      // persistence is best-effort; the read itself already succeeded
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
