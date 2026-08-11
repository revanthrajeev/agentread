import type { AuditResult } from "@/lib/engine/crawl";
import { generateLlmsFullTxt, generateLlmsTxt } from "@/lib/engine/llmstxt";
import { KNOWN_AI_CRAWLERS } from "@/lib/serve/crawlers";
import type { FileChange, FixResult, RepoContext } from "./types";

/** UA tokens (the Record's keys) — the values are human-readable vendor descriptions. */
const CRAWLER_TOKENS = Object.keys(KNOWN_AI_CRAWLERS);

/**
 * Deterministic fixers — generated from data we already hold, with no model call.
 *
 * These are the highest-margin output the product has: a real, reviewable code change
 * that costs nothing to produce. Anything that can be moved from the LLM path into this
 * file is pure gross margin, so prefer adding here over prompting.
 */

/** Where static assets live, per framework. Wrong guesses are cheap — the PR shows the path. */
function publicDir(framework: string): string {
  switch (framework) {
    case "nextjs":
    case "react":
    case "vite":
    case "astro":
      return "public";
    case "nuxt":
      return "public";
    case "sveltekit":
      return "static";
    case "gatsby":
      return "static";
    case "hugo":
      return "static";
    case "jekyll":
      return ".";
    default:
      return "public";
  }
}

export function fixLlmsTxt(audit: AuditResult, repo: RepoContext): FixResult {
  const dir = publicDir(repo.framework);
  const index = generateLlmsTxt(audit);
  const full = generateLlmsFullTxt(audit);

  const changes: FileChange[] = [
    {
      path: `${dir}/llms.txt`,
      contents: index,
      rationale:
        "Curated index of the site for language models. Agents check /llms.txt before crawling; without it they have no sanctioned map and fall back to guessing.",
    },
    {
      path: `${dir}/llms-full.txt`,
      contents: full,
      rationale:
        "The whole site as one Markdown document. This variant measures roughly twice the crawler traffic of the index, because a model can ingest everything in a single fetch.",
    },
  ];

  return {
    issueKey: "missing_llms_txt",
    strategy: "deterministic",
    ok: true,
    title: "Add llms.txt and llms-full.txt",
    changes,
    explanation: `Generated from the ${audit.pagesCrawled} pages this audit crawled — every link points at a page that was actually fetched and scored, so nothing here is invented.`,
    costUsd: 0,
  };
}

export function fixRobotsTxt(repo: RepoContext, existing: string | null): FixResult {
  const dir = publicDir(repo.framework);
  const path = `${dir}/robots.txt`;

  const agents = CRAWLER_TOKENS;
  const alreadyCovered = existing
    ? agents.filter((a) => new RegExp(`User-agent:\\s*${a}`, "i").test(existing))
    : [];

  if (existing && alreadyCovered.length === agents.length) {
    return {
      issueKey: "missing_ai_crawler_rules",
      strategy: "deterministic",
      ok: true,
      title: "AI crawler rules already present",
      changes: [],
      explanation: "robots.txt already names every AI crawler we check for — nothing to change.",
      costUsd: 0,
    };
  }

  const block = [
    "",
    "# AI crawlers — added by AgentRead",
    "# Explicitly allowing these means agents index the site instead of guessing at",
    "# whether they're permitted to. Remove any you don't want reading your content.",
    ...agents.flatMap((a) => [`User-agent: ${a}`, "Allow: /", ""]),
  ].join("\n");

  // Append rather than replace: an existing robots.txt encodes decisions we can't infer.
  const contents = existing ? `${existing.trimEnd()}\n${block}` : `User-agent: *\nAllow: /\n${block}`;

  return {
    issueKey: "missing_ai_crawler_rules",
    strategy: "deterministic",
    ok: true,
    title: "Allow AI crawlers in robots.txt",
    changes: [
      {
        path,
        contents,
        rationale: existing
          ? "Appended explicit AI-crawler rules to the existing robots.txt; nothing already in the file was modified."
          : "Created robots.txt with explicit AI-crawler rules.",
      },
    ],
    explanation: `Added rules for ${agents.length} AI crawlers${
      alreadyCovered.length ? ` (${alreadyCovered.length} were already covered)` : ""
    }.`,
    costUsd: 0,
  };
}

/**
 * Emits the Serve middleware as real, self-contained source. This ships the same
 * two-hop design the hosted product uses: edge-safe UA matching in the middleware,
 * with the Node-only extraction work behind a separate route.
 */
export function fixServeMiddleware(repo: RepoContext): FixResult {
  if (repo.framework !== "nextjs") {
    return {
      issueKey: "missing_serve_middleware",
      strategy: "deterministic",
      ok: false,
      title: "Install the Serve middleware",
      changes: [],
      explanation: `Automated install currently covers Next.js only; this repo looks like "${repo.framework}". The Read API can still be called directly.`,
      error: "unsupported_framework",
      costUsd: 0,
    };
  }

  const usesSrc = repo.tree.some((p) => p.startsWith("src/app/") || p.startsWith("src/pages/"));
  const prefix = usesSrc ? "src/" : "";

  const middleware = `import type { NextRequest } from "next/server";

/**
 * AgentRead Serve — humans get this site unchanged; known AI crawlers get clean Markdown.
 *
 * Kept free of Node-only dependencies on purpose: this file is bundled for the edge on
 * several platforms, so the actual fetch-and-distill work happens in the API route below.
 */

const AI_CRAWLERS = ${JSON.stringify(CRAWLER_TOKENS, null, 2)};

const EXCLUDED = ["/api/", "/_next/", "/auth/"];

export async function proxy(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  const crawler = AI_CRAWLERS.find((name) => ua.toLowerCase().includes(name.toLowerCase()));

  const { pathname } = request.nextUrl;
  const skip =
    request.method !== "GET" ||
    !crawler ||
    EXCLUDED.some((p) => pathname.startsWith(p)) ||
    /\\.[a-z0-9]+$/i.test(pathname);

  if (skip) return;

  try {
    const res = await fetch("https://agentread.tech/api/v1/read", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: \`Bearer \${process.env.AGENTREAD_API_KEY}\`,
      },
      body: JSON.stringify({ url: request.url }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return;

    const result = await res.json();
    return new Response(result.markdown, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "x-agentread-served": "true",
        "x-readscore": String(result.readScore),
        "cache-control": "public, max-age=600",
      },
    });
  } catch {
    // Fail open: a broken Serve layer must never be why a crawler gets nothing.
    return;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
`;

  return {
    issueKey: "missing_serve_middleware",
    strategy: "deterministic",
    ok: true,
    title: "Install the Serve middleware",
    changes: [
      {
        path: `${prefix}proxy.ts`,
        contents: middleware,
        rationale:
          "Serves distilled Markdown to known AI crawlers and the unchanged page to everyone else. Fails open — if the call fails, crawlers get normal HTML rather than nothing. Note Next.js 16 renamed middleware.ts to proxy.ts, and it must sit beside the app directory.",
      },
    ],
    explanation:
      "Requires AGENTREAD_API_KEY in the environment. Without it the middleware no-ops and the site behaves exactly as it does today.",
    costUsd: 0,
  };
}
