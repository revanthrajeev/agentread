import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";

/** Score-only endpoint for the public ReadScan tool — no auth, no persistence, just a score. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    const result = await readUrl(url);
    return NextResponse.json({
      url: result.url,
      title: result.title,
      readScore: result.readScore,
      hallucinationRisk: result.hallucinationRisk,
      flags: result.flags,
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
