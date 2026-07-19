import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";

/**
 * Internal-only route: does the actual fetch + Readability + Turndown work for the Serve
 * middleware. It exists as a separate Node.js-runtime route (not called in-process from
 * proxy.ts) because proxy.ts is bundled as an Edge Function on Netlify, and jsdom — a
 * Node-native dependency of the extraction engine — cannot be loaded in that sandbox
 * (confirmed via a real Netlify build failure: "Failed to load external module jsdom").
 * Locked behind a shared secret since it isn't part of the public API surface.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_SERVE_SECRET || secret !== process.env.INTERNAL_SERVE_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  try {
    const result = await readUrl(url);
    return NextResponse.json({
      markdown: result.markdown,
      readScore: result.readScore,
      hallucinationRisk: result.hallucinationRisk,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
