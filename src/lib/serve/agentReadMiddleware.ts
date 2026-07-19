import type { NextRequest } from "next/server";
import { readUrl } from "@/lib/engine/read";
import { detectCrawler } from "./crawlers";

const EXCLUDED_PREFIXES = ["/api/", "/_next/", "/auth/"];

/**
 * Layer 2 — Serve. Humans get the site unchanged; requests from known AI crawlers get the
 * same clean Markdown the Read API produces, instead of full page HTML. This is the same
 * engine as /api/v1/read — a crawler hit triggers a real (cached, 10 min TTL) fetch-and-distill
 * of the requested URL, not a canned response.
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

  try {
    const result = await readUrl(request.url);
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
