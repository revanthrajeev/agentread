import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";
import { recordPublicScan } from "@/lib/stats";

/**
 * Score-only endpoint for the public ReadScan tool — no auth, no account.
 *
 * It does now persist one row per scan, which it previously did not. That gap meant the
 * landing page's "websites scanned" counter could never move from the product's highest-volume
 * surface: the free scanner is the acquisition funnel, so every scan running through here was
 * invisible to the public stats it should have been feeding.
 */
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
  // Unauthenticated and it does real crawling work, so it needs a meter — and a public
  // counter fed by an unmetered endpoint is an invitation to inflate it.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded (10/min). Sign up free for higher limits." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    const result = await readUrl(url);

    // Fire-and-forget: analytics must never fail, slow, or alter the user's scan. A Supabase
    // outage should cost us a counter increment, not the score the visitor came for.
    void recordPublicScan(result);

    return NextResponse.json({
      url: result.url,
      title: result.title,
      readScore: result.readScore,
      hallucinationRisk: result.hallucinationRisk,
      flags: result.flags,
      seoScore: result.seoScore,
      seoFlags: result.seoFlags,
      protocolScore: result.protocolScore,
      protocolFlags: result.protocolFlags,
      hybridScore: Math.round((result.readScore + result.seoScore) / 2),
      htmlBytes: result.htmlBytes,
      markdownBytes: result.markdownBytes,
      tokensBefore: result.tokensBefore,
      tokensAfter: result.tokensAfter,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
