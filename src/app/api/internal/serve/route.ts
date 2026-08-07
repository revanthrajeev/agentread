import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";
import { recordAgentHit } from "@/lib/analytics/agentHits";
import { verifyApiKey } from "@/lib/auth/apiKey";

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

    // Log the agent hit. When this deployment serves its own site there's no owning customer,
    // so the row is host-scoped with a null user; a customer running the Serve middleware sets
    // AGENTREAD_API_KEY, which attributes the traffic to their dashboard.
    if (typeof body?.crawler === "string") {
      const ownerKey = process.env.AGENTREAD_API_KEY;
      const owner = ownerKey ? await verifyApiKey(ownerKey) : null;
      await recordAgentHit({
        userId: owner?.userId ?? null,
        host: safeHost(url),
        path: typeof body?.path === "string" ? body.path : "/",
        crawler: body.crawler,
        userAgent: typeof body?.userAgent === "string" ? body.userAgent : null,
        readScore: result.readScore,
        markdownBytes: result.markdownBytes,
        tokensSaved: Math.max(0, result.tokensBefore - result.tokensAfter),
      });
    }

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

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}
