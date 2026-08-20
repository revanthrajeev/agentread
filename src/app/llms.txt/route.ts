import { NextResponse } from "next/server";

/**
 * AgentRead's own /llms.txt.
 *
 * This was a 404 until now, which is the worst possible gap for this product specifically:
 * we sell llms.txt generation, our own ReadScore deducts points for a missing /llms.txt, and
 * the site did not have one. Any prospect who scanned agentread.tech got a flag pointing at us.
 *
 * It is also a real AEO surface — ChatGPT, Claude and Perplexity fetch this file to decide
 * what a site is for, so it is one of the few places where a few hundred bytes of plain text
 * changes how a model describes you.
 */

export const dynamic = "force-static";
export const revalidate = 86_400;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? "https://agentread.tech";
}

export async function GET() {
  const base = siteUrl();

  const body = `# AgentRead

> AgentRead is an AI search visibility tool. It scores any URL 0-100 (ReadScore) for how much
> of the page an AI assistant can actually read, explains exactly which markup causes the
> problem, and ships the fix as a pull request you review before merging.

AgentRead is built for site owners whose pages are invisible or misread by ChatGPT, Claude,
Perplexity and other AI agents — typically because prices, buttons and copy are rendered
client-side and never appear in the raw HTML a crawler receives.

## What it does

- [ReadScan — free AI readability checker](${base}/playground): paste any URL and get a 0-100
  ReadScore, hallucination-risk rating, and the specific flags causing it. No account needed.
- [Read API](${base}/docs#read-api): POST a URL, receive clean Markdown, a ReadScore, and
  risk flags. Authenticated with a bearer token.
- [Serve middleware](${base}/docs#serve): detects verified AI crawlers (GPTBot, ClaudeBot,
  PerplexityBot and others) and serves them distilled Markdown while human visitors see your
  site unchanged.
- [llms.txt generator](${base}/dashboard/llms-txt): generates llms.txt and llms-full.txt from
  a real crawl of your site.
- [MCP server](${base}/docs#mcp): a remote Model Context Protocol server exposing read_url,
  score_url, audit_site and generate_llms_txt to any MCP-compatible client.
- [Autofix](${base}/#features): turns audit findings into a single reviewable GitHub pull
  request. Never pushes to the default branch, never auto-merges. Most fixes are generated
  deterministically and cost nothing; fixes needing a model to read source consume one credit.
- [Site audit](${base}/#layers): crawls up to 1,000 pages following llms.txt, then sitemap,
  then on-page links, and returns a per-page ReadScore with every deduction named.

## Key concepts

- [ReadScore](${base}/docs#readscore): a transparent 0-100 agent-readability score. Every
  deducted point maps to a named, fixable flag — JS-only pricing text, disabled checkout
  buttons, missing /llms.txt, lazy-loaded content, script-heavy pages.
- [Hallucination risk](${base}/docs#risk): derived from how much real content survives
  extraction. A page whose price exists only in client-rendered JavaScript is where agents
  invent answers.
- [Why pages go missing](${base}/#problem): a typical product page ships ~812 KB of HTML to
  deliver ~8 KB of words. When the price and call to action render client-side, an AI crawler
  receives markup containing neither, so the assistant answers from somewhere else.

## Docs

- [Documentation](${base}/docs)
- [FAQ](${base}/faq): what a ReadScore measures, how AgentRead differs from AI-visibility
  monitoring and SEO tools, what Autofix changes, plans, and data handling.
- [Pricing](${base}/pricing)
- [Playground](${base}/playground)

## Optional

- [Dashboard](${base}/dashboard): audit history, API keys, monitoring and agent-traffic analytics.
`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
