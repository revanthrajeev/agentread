import { NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { readUrl, type ReadResult } from "@/lib/engine/read";
import { extractBearerToken, verifyApiKey } from "@/lib/auth/apiKey";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Remote MCP server (Streamable HTTP, stateless — a fresh McpServer/transport per request,
 * matching how Vercel serverless functions execute). Add this URL to any MCP-capable client
 * (Claude, ChatGPT connectors, custom agents) with an AgentRead API key as the bearer token.
 * Exposes the same engine as /api/v1/read, just addressed as MCP tools instead of a REST call.
 */

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
