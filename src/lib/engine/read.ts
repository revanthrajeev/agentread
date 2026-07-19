import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
// @ts-expect-error — no bundled types for the gfm plugin
import { gfm } from "turndown-plugin-gfm";

export interface ReadFlag {
  severity: "high" | "medium" | "low" | "ok";
  text: string;
}

export interface ReadResult {
  url: string;
  markdown: string;
  title: string;
  /** First ~2000 chars of the raw fetched HTML — real bytes, not a placeholder, for side-by-side display. */
  htmlSnippet: string;
  htmlBytes: number;
  markdownBytes: number;
  tokensBefore: number;
  tokensAfter: number;
  readScore: number;
  hallucinationRisk: "low" | "medium" | "high";
  flags: ReadFlag[];
  latencyMs: number;
  cache: "HIT" | "MISS";
}

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
turndown.use(gfm);
// strip elements that never carry agent-useful signal
turndown.remove(["script", "style", "noscript", "iframe", "nav", "footer"]);

/** Rough token estimate — ~4 chars/token, the same heuristic OpenAI/Anthropic docs quote. */
function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

const cache = new Map<string, ReadResult>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

export async function readUrl(rawUrl: string, opts: { fresh?: boolean } = {}): Promise<ReadResult> {
  const url = normalizeUrl(rawUrl);
  const t0 = Date.now();

  if (!opts.fresh && cache.has(url)) {
    const ts = cacheTimestamps.get(url) ?? 0;
    if (Date.now() - ts < CACHE_TTL_MS) {
      return { ...cache.get(url)!, cache: "HIT", latencyMs: Date.now() - t0 };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AgentReadBot/1.0; +https://agentread.dev/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const htmlBytes = Buffer.byteLength(html, "utf8");

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // signal detection BEFORE Readability strips things — feeds the risk flags
  const bodyText = doc.body?.textContent ?? "";
  const scriptCount = doc.querySelectorAll("script").length;
  const noscriptPriceHint = /price|\$\s?\d|₹\s?\d/i.test(bodyText) === false &&
    /price|buy now|add to cart/i.test(html);
  const hasDisabledCta = /disabled[^>]*>[^<]*(buy|checkout|add to cart)/i.test(html);
  const hasLazyContent = /loading=["']lazy["']|data-lazy|IntersectionObserver/i.test(html);

  let llmsTxtExists = false;
  try {
    const llmsRes = await fetch(new URL("/llms.txt", url).toString(), {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    });
    llmsTxtExists = llmsRes.ok;
  } catch {
    llmsTxtExists = false;
  }

  const article = new Readability(doc).parse();
  const title = article?.title || doc.title || url;
  const contentHtml = article?.content || doc.body?.innerHTML || "";
  let markdown = turndown.turndown(contentHtml).trim();

  if (!markdown || markdown.length < 40) {
    // Readability found nothing usable (SPA shell, paywall, bot-wall) — fall back to raw text
    markdown = (doc.body?.textContent || "").replace(/\s+\n/g, "\n").trim().slice(0, 4000);
  }

  markdown = `# ${title}\n\n${markdown}`;
  const markdownBytes = Buffer.byteLength(markdown, "utf8");

  const tokensBefore = estimateTokens(html);
  const tokensAfter = estimateTokens(markdown);

  // ---------------- ReadScore heuristic (0-100) ----------------
  // Transparent, explainable scoring — not a black box, so it can be published as-is.
  let score = 100;
  const flags: ReadFlag[] = [];

  const reductionPct = 1 - markdownBytes / Math.max(htmlBytes, 1);
  if (reductionPct < 0.5) {
    score -= 15;
    flags.push({ severity: "medium", text: "Low payload reduction — page may already be light, or content wasn't fully extracted." });
  }

  if (scriptCount > 25) {
    score -= 10;
    flags.push({ severity: "medium", text: `${scriptCount} <script> tags detected — heavy client-side rendering risk for non-JS readers.` });
  }

  if (noscriptPriceHint) {
    score -= 20;
    flags.push({ severity: "high", text: "Price/CTA keywords found in raw HTML but not in extracted text — likely rendered client-side only." });
  }

  if (hasDisabledCta) {
    score -= 15;
    flags.push({ severity: "high", text: "A buy/checkout button appears disabled in markup — may hydrate after JavaScript runs." });
  }

  if (hasLazyContent) {
    score -= 8;
    flags.push({ severity: "low", text: "Lazy-loaded content detected — some sections may be invisible to non-rendering readers." });
  }

  if (!llmsTxtExists) {
    score -= 7;
    flags.push({ severity: "medium", text: "No /llms.txt found — agents have no sanctioned map of this site." });
  } else {
    flags.push({ severity: "ok", text: "/llms.txt found and reachable." });
  }

  if (markdown.length < 200) {
    score -= 25;
    flags.push({ severity: "high", text: "Very little text content could be extracted — possible bot-wall, paywall, or empty SPA shell." });
  }

  score = Math.max(1, Math.min(100, Math.round(score)));

  const hallucinationRisk: ReadResult["hallucinationRisk"] =
    score >= 75 ? "low" : score >= 55 ? "medium" : "high";

  if (flags.length === 0) {
    flags.push({ severity: "ok", text: "No risk signals detected — page reads cleanly for agents." });
  }

  const result: ReadResult = {
    url,
    markdown,
    title,
    htmlSnippet: html.slice(0, 2000),
    htmlBytes,
    markdownBytes,
    tokensBefore,
    tokensAfter,
    readScore: score,
    hallucinationRisk,
    flags,
    latencyMs: Date.now() - t0,
    cache: "MISS",
  };

  cache.set(url, result);
  cacheTimestamps.set(url, Date.now());

  return result;
}

function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return new URL(u).toString();
}
