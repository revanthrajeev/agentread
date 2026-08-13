import { NextResponse } from "next/server";
import { readUrl } from "@/lib/engine/read";

/**
 * Embeddable ReadScore badge — GET /api/badge?url=https://example.com, drop the result in
 * an <img> or a README. Deliberately unauthenticated and uncached beyond readUrl's own
 * 10-minute cache: the whole point of a badge is that it's trivially embeddable, and gating
 * it behind an API key would kill the organic-distribution loop it exists for. Always a
 * real score — never a placeholder — since a badge showing a fake number would be the exact
 * kind of fabricated-metric problem already ruled out for this product's landing page.
 */

function color(score: number): string {
  if (score >= 75) return "#34d399"; // emerald — matches the site's "low risk" color
  if (score >= 55) return "#fbbf24"; // amber — "needs work"
  return "#fb7185"; // rose — "at risk"
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
}

function svg(label: string, value: string, fill: string): string {
  // Rough monospace-ish width estimate — good enough for a badge, not a typesetting engine.
  const labelW = 10 + label.length * 6.4;
  const valueW = 14 + value.length * 7.2;
  const totalW = Math.round(labelW + valueW);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#1a1a2e"/>
    <rect x="${labelW}" width="${valueW}" height="20" fill="${fill}"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelW / 2}" y="14">${escapeXml(label)}</text>
    <text x="${labelW + valueW / 2}" y="14">${escapeXml(value)}</text>
  </g>
</svg>`;
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return new NextResponse(svg("agentread", "missing ?url", "#71717a"), {
      headers: { "content-type": "image/svg+xml", "cache-control": "no-store" },
    });
  }

  try {
    const result = await readUrl(target);
    const body = svg("agent readability", `${result.readScore}/100`, color(result.readScore));
    return new NextResponse(body, {
      headers: {
        "content-type": "image/svg+xml",
        // Short cache — long enough to absorb badge-render bursts (a README viewed by many
        // people at once), short enough that a real fix shows up on the badge same-day.
        "cache-control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch {
    return new NextResponse(svg("agent readability", "unreachable", "#71717a"), {
      headers: { "content-type": "image/svg+xml", "cache-control": "no-store" },
    });
  }
}
