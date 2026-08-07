import { NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { readUrl, type ReadResult } from "@/lib/engine/read";
import { auditSite } from "@/lib/engine/crawl";
import { generateLlmsFullTxt, generateLlmsTxt } from "@/lib/engine/llmstxt";
import { extractBearerToken, verifyApiKey } from "@/lib/auth/apiKey";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkQuota, recordUsage } from "@/lib/billing/usage";
import { saveAudit } from "@/lib/audit/store";

/**
 * Remote MCP server (Streamable HTTP, stateless — a fresh McpServer/transport per request,
 * matching how Vercel serverless functions execute). Add this URL to any MCP-capable client
 * (Claude, ChatGPT connectors, custom agents) with an AgentRead API key as the bearer token.
 * Exposes the same engine as /api/v1/read, just addressed as MCP tools instead of a REST call.
 */

// audit_site / generate_llms_txt crawl many pages — the platform default would cut them off.
export const maxDuration = 300;

function persistRead(userId: string, result: ReadResult, agent: string) {
  createAdminClient()
    .from("reads")
    .insert({
      user_id: userId,
      url: result.url,
      agent,
      html_bytes: result.htmlBytes,
      markdown_bytes: result.markdownBytes,
      tokens_before: result.tokensBefore,
      tokens_after: result.tokensAfter,
      read_score: result.readScore,
      hallucination_risk: result.hallucinationRisk,
      flags: result.flags,
      latency_ms: result.latencyMs,
      cache_state: result.cache,
    })
    .then(
      () => {},
      () => {} // best-effort — persistence failures never block the tool response
    );
}

function buildServer(userId: string) {
  const server = new McpServer({ name: "agentread", version: "1.0.0" });

  server.registerTool(
    "read_url",
    {
      title: "Read URL",
      description:
        "Fetch a URL and return clean Markdown plus its ReadScore (0-100 agent-readability score) and risk flags (JS-only prices, disabled CTAs, missing content). Use this instead of a raw fetch before summarizing or quoting a web page, to avoid missing client-side-only content.",
      inputSchema: { url: z.string().describe("The URL to fetch, extract, and score") },
    },
    async ({ url }) => {
      const result = await readUrl(url);
      persistRead(userId, result, "mcp:read_url");
      const flagLines = result.flags.map((f) => `- [${f.severity}] ${f.text}`).join("\n");
      return {
        content: [
          {
            type: "text",
            text: `# ReadScore: ${result.readScore}/100 (${result.hallucinationRisk} hallucination risk)\n\n${flagLines}\n\n---\n\n${result.markdown}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "score_url",
    {
      title: "Score URL",
      description:
        "Score a URL's agent-readability (0-100) and list risk flags without returning the full extracted content — cheaper than read_url when only the score is needed.",
      inputSchema: { url: z.string().describe("The URL to score") },
    },
    async ({ url }) => {
      const result = await readUrl(url);
      persistRead(userId, result, "mcp:score_url");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                url: result.url,
                readScore: result.readScore,
                hallucinationRisk: result.hallucinationRisk,
                flags: result.flags,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "audit_site",
    {
      title: "Audit site",
      description:
        "Crawl a whole site and score every page for AI-agent readability. Discovers pages via llms.txt, then sitemap.xml, then on-page links. Returns the average ReadScore, the worst pages, and the issues costing the site points. Use this when asked how readable or agent-friendly an entire website is, rather than calling read_url page by page.",
      inputSchema: {
        url: z.string().describe("Root URL of the site to audit, e.g. https://example.com"),
        pages: z
          .number()
          .optional()
          .describe("Maximum pages to crawl (default 10; capped by the account's plan)"),
      },
    },
    async ({ url, pages }) => {
      const quota = await checkQuota(userId, "audits");
      if (!quota.allowed) {
        return {
          content: [{ type: "text", text: `Quota exceeded: ${quota.reason}` }],
          isError: true,
        };
      }

      const limit = Math.max(1, Math.min(pages ?? 10, quota.plan.limits.pagesPerAudit));
      const audit = await auditSite(url, { pages: limit });
      const stored = await saveAudit(userId, audit, { share: false });
      await recordUsage(userId, { audits: 1, pages: audit.pagesCrawled });

      const worst = audit.pages
        .filter((p) => p.ok)
        .sort((a, b) => a.readScore - b.readScore)
        .slice(0, 5)
        .map((p) => `- ${p.readScore}/100 — ${p.url}`)
        .join("\n");

      const issues = audit.topIssues
        .slice(0, 6)
        .map((i) => `- [${i.severity}] ${i.text} (${i.count} page${i.count === 1 ? "" : "s"})`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: [
              `# ${audit.host} — average ReadScore ${audit.avgScore}/100`,
              ``,
              `Crawled ${audit.pagesCrawled} pages (discovered via ${audit.discovery}). Range ${audit.minScore}–${audit.maxScore}.`,
              `llms.txt: ${audit.hasLlmsTxt ? "present" : "missing"}.`,
              `Tokens to read the whole site: ${audit.tokensBefore.toLocaleString()} raw → ${audit.tokensAfter.toLocaleString()} distilled.`,
              stored?.id ? `Audit id: ${stored.id}` : ``,
              ``,
              `## Lowest-scoring pages`,
              worst || "(none)",
              ``,
              `## Issues`,
              issues || "(none detected)",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
    }
  );

  server.registerTool(
    "generate_llms_txt",
    {
      title: "Generate llms.txt",
      description:
        "Crawl a site and generate the contents of its llms.txt (a curated Markdown index of the site for language models) or llms-full.txt (the entire site's Markdown concatenated). Use when asked to create, write, or fix a site's llms.txt file.",
      inputSchema: {
        url: z.string().describe("Root URL of the site"),
        variant: z
          .enum(["index", "full"])
          .optional()
          .describe("'index' for llms.txt (default), 'full' for llms-full.txt"),
        pages: z.number().optional().describe("Maximum pages to crawl (default 20)"),
      },
    },
    async ({ url, variant, pages }) => {
      const quota = await checkQuota(userId, "audits");
      if (!quota.allowed) {
        return {
          content: [{ type: "text", text: `Quota exceeded: ${quota.reason}` }],
          isError: true,
        };
      }

      const limit = Math.max(1, Math.min(pages ?? 20, quota.plan.limits.pagesPerAudit));
      const audit = await auditSite(url, { pages: limit });
      await saveAudit(userId, audit, { share: false });
      await recordUsage(userId, { audits: 1, pages: audit.pagesCrawled });

      const content =
        variant === "full" ? generateLlmsFullTxt(audit) : generateLlmsTxt(audit);

      return { content: [{ type: "text", text: content }] };
    }
  );

  return server;
}

async function handle(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization header. Add an AgentRead API key: Authorization: Bearer sk-ar-..." },
      { status: 401 }
    );
  }

  const auth = await verifyApiKey(token);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const server = buildServer(auth.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
