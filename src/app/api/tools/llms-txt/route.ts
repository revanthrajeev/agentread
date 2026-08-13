import { NextResponse } from "next/server";
import { auditSite } from "@/lib/engine/crawl";
import { generateLlmsFullTxt, generateLlmsTxt } from "@/lib/engine/llmstxt";

/**
 * Free, no-account llms.txt generator — the standalone /tools/llms-txt-generator page.
 * Unauthenticated by design (this is the acquisition surface the SEO research flagged as
 * the single highest-volume, lowest-competition term to target), so the meter is crawl
 * size rather than a login wall: capped to 8 pages, well short of the paid API's up-to-200.
 */
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const MAX_PAGES = 8;

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

export const maxDuration = 120;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded (5/min). Sign up free for the full API — up to 200 pages per crawl." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url : null;
  if (!url) return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });

  try {
    const audit = await auditSite(url, { pages: MAX_PAGES });
    return NextResponse.json({
      host: audit.host,
      pagesCrawled: audit.pagesCrawled,
      avgScore: audit.avgScore,
      llmsTxt: generateLlmsTxt(audit),
      llmsFullTxt: generateLlmsFullTxt(audit),
      capped: audit.pagesCrawled >= MAX_PAGES,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to crawl and generate";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
