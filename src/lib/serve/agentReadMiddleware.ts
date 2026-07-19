import type { NextRequest } from "next/server";
import { detectCrawler } from "./crawlers";

const EXCLUDED_PREFIXES = ["/api/", "/_next/", "/auth/"];

/**
 * Layer 2 — Serve. Humans get the site unchanged; requests from known AI crawlers get the
 * same clean Markdown the Read API produces, instead of full page HTML.
 *
 * This function must stay free of any Node-native dependency (jsdom, Readability, Turndown):
 * proxy.ts is bundled as an Edge Function on Netlify, which cannot load jsdom (confirmed via
 * a real "Failed to load external module jsdom" build failure). The actual fetch-and-distill
 * work happens in /api/internal/serve, a normal Node.js-runtime route — this function just
 * detects the crawler (cheap, edge-safe) and makes a network call to that route.
 *
 * Returns a markdown Response to short-circuit the request, or null to let it continue normally.
 */
export async function serveMarkdownToCrawlers(request: NextRequest): Promise<Response | null> {
  if (request.method !== "GET") return null;

  const { pathname } = request.nextUrl;
  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (/\.[a-z0-9]+$/i.test(pathname)) return null; // static assets (favicon.ico, .svg, .png, ...)

  const crawler = detectCrawler(request.headers.get("user-agent"));
  if (!crawler) return null;

  const secret = process.env.INTERNAL_SERVE_SECRET;
  if (!secret) return null; // Serve layer not configured — fall through, never block the page

  try {
    const internalUrl = new URL("/api/internal/serve", request.nextUrl.origin);
    const res = await fetch(internalUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ url: request.url }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Internal serve route responded ${res.status}`);
    const result = (await res.json()) as {
      markdown: string;
      readScore: number;
      hallucinationRisk: string;
    };

    return new Response(result.markdown, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "x-agentread-served": "true",
        "x-agentread-crawler": crawler,
        "x-readscore": String(result.readScore),
        "x-hallucination-risk": result.hallucinationRisk,
        "cache-control": "public, max-age=600",
      },
    });
  } catch (err) {
    console.error("[agentread serve] failed to distill for crawler:", err);
    // if the self-fetch/distill fails for any reason, fall through to the normal page —
    // a broken Serve layer must never be the reason a crawler gets nothing at all
    return null;
  }
}
