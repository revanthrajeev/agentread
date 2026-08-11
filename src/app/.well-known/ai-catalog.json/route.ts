import { NextResponse } from "next/server";

/**
 * Agentic Resource Discovery (ARD) manifest — v0.9 draft spec, published 2026-06-17 by
 * Google, Microsoft, GitHub and eight other companies. An agent that supports ARD checks
 * this well-known path before anything else to find out what a site exposes.
 *
 * This is worth having for a reason beyond SEO: it is the single newest surface in this
 * entire category. Every competitor named in PROJECT.md predates ARD by months; none of
 * them score for it yet, so shipping it correctly is a real (if small) first-mover edge
 * rather than another entry in an already-crowded "AI crawlability checker" market.
 *
 * Schema verified against ards-project/ard-spec's ai-catalog.schema.json rather than
 * guessed — a malformed manifest for a spec this new would be worse than no manifest at
 * all, since there is no established convention to fall back on if we get it wrong.
 *
 * `type` is a free-form IANA-media-type-shaped string, not a closed enum — but each entry
 * below is still held to the same rule as everything else on this site: the type claims
 * what the linked URL actually is. The MCP entry gets `application/mcp-server-card+json`
 * because /api/mcp genuinely speaks that protocol; the other two entries point at an HTML
 * docs page and an HTML tool, not a machine-readable manifest, so they're typed `text/html`
 * rather than borrowing a more impressive-sounding type nothing behind the link honours.
 */

export const dynamic = "force-static";
export const revalidate = 86_400;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? "https://agentread.tech";
}

export async function GET() {
  const base = siteUrl();

  const manifest = {
    specVersion: "1.0",
    host: {
      name: "AgentRead",
      url: base,
    },
    entries: [
      {
        identifier: "urn:air:agentread.tech:mcp:server",
        displayName: "AgentRead MCP Server",
        description:
          "Remote Model Context Protocol server exposing read_url, score_url, audit_site and generate_llms_txt to any MCP-compatible client.",
        type: "application/mcp-server-card+json",
        url: `${base}/api/mcp`,
        capabilities: ["read_url", "score_url", "audit_site", "generate_llms_txt"],
      },
      {
        identifier: "urn:air:agentread.tech:api:read",
        displayName: "AgentRead Read API",
        description:
          "Fetches a URL and returns clean, scored Markdown plus AI-readability risk flags. Authenticated with a bearer API key. Documented at the linked page, not published as a separate machine-readable spec.",
        type: "text/html",
        url: `${base}/docs#read-api`,
        capabilities: ["read", "score"],
        representativeQueries: [
          "convert this page to markdown for an agent",
          "score this url for AI readability",
        ],
      },
      {
        identifier: "urn:air:agentread.tech:tool:readscan",
        displayName: "ReadScan — free AI readability checker",
        description:
          "Paste any URL and get a 0-100 ReadScore, hallucination-risk rating, and the specific markup flags causing it. No account required.",
        type: "text/html",
        url: `${base}/playground`,
        capabilities: ["score"],
        representativeQueries: ["is my site readable by AI agents", "check AI crawlability"],
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
