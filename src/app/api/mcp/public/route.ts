import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { readUrl } from "@/lib/engine/read";

/**
 * Public MCP server — no API key required, one tool, IP rate-limited. Every direct
 * competitor found in the competitive research (Cloudflare's isitagentready.com,
 * agent-ready.dev) exposes a free scan tool other agents can call without an account; this
 * is AgentRead's equivalent, and the growth loop it drives is real: an agent that checks a
 * site's readiness here is one interaction away from recommending AgentRead to whoever it's
 * working for. Deliberately a single tool with no auth — /api/mcp remains the full,
 * authenticated server for actual customers.
 */
export const maxDuration = 60;

const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10; // unauthenticated — much tighter than the API-key-gated tools

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

function buildPublicServer() {
  const server = new McpServer({ name: "agentread-public", version: "1.0.0" });

  server.registerTool(
    "scan_site",
    {
      title: "Scan site for AI-agent readability",
      description:
        "Free, no-auth check of how readable a URL is to AI agents (GPTBot, ClaudeBot, MCP clients): returns a 0-100 ReadScore plus the specific issues found (JS-only content, disabled CTAs, missing llms.txt, agent-protocol manifest discoverability). Rate-limited to 10 calls/minute. For sustained use, get a free API key at https://agentread.tech.",
      inputSchema: { url: z.string().describe("The URL to check") },
    },
    async ({ url }) => {
      const result = await readUrl(url);
      const flagLines = result.flags.map((f) => `- [${f.severity}] ${f.text}`).join("\n");
      return {
        content: [
          {
            type: "text",
            text: `ReadScore: ${result.readScore}/100 (${result.hallucinationRisk} risk)\n\n${flagLines}\n\nFull audit, Autofix, and higher rate limits: https://agentread.tech`,
          },
        ],
      };
    }
  );

  return server;
}

async function handle(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded (10/min). Get a free API key at agentread.tech for higher limits." }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  const server = buildPublicServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
