import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";
import { checkCitationReadiness, isCitationCheckConfigured } from "@/lib/citation/check";
import { extractBearerToken, verifyApiKey } from "@/lib/auth/apiKey";

/**
 * Citation-readiness spot-check (see src/lib/citation/check.ts for what this is and, more
 * importantly, what it deliberately isn't). API-key authenticated like the rest of v1 —
 * this makes a real inference call per request, so it isn't the free/public surface.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Authorization: Bearer sk-ar-..." },
      { status: 401 }
    );
  }
  const auth = await verifyApiKey(token);
  if (!auth) return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });

  if (!isCitationCheckConfigured()) {
    return NextResponse.json({ error: "Citation check is not configured on this deployment." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : null;
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";

  if (!url) return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  if (!topic) {
    return NextResponse.json(
      { error: "Missing required field: topic — the question a user might ask that this page should answer." },
      { status: 400 }
    );
  }

  try {
    const read = await readUrl(url);
    const result = await checkCitationReadiness(read.markdown, topic);
    return NextResponse.json({
      url: read.url,
      topic,
      would_cite: result.wouldCite,
      confidence: result.confidence,
      reasoning: result.reasoning,
      note: "A single model's judgment from this page's content — not a measurement of real ChatGPT/Perplexity/Gemini citation behavior.",
      cost_usd: result.costUsd,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Citation check failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
