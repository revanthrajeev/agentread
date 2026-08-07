import { parseHTML } from "linkedom";
import { readUrl, type ReadFlag, type ReadResult } from "./read";

/**
 * Layer 1b — Crawl. The single-URL Read engine scores one page; an Audit scores a whole site
 * and rolls the findings up. This is the unit of work the paid plans meter, and the thing a
 * free single-URL scan can't answer: "is my *site* readable by agents, and where is it worst?"
 */

export interface AuditPage {
  url: string;
  title: string;
  ok: boolean;
  error?: string;
  readScore: number;
  hallucinationRisk: ReadResult["hallucinationRisk"];
  htmlBytes: number;
  markdownBytes: number;
  tokensBefore: number;
  tokensAfter: number;
  markdown: string;
  flags: ReadFlag[];
  latencyMs: number;
}

export interface IssueRollup {
  text: string;
  severity: ReadFlag["severity"];
  count: number;
}

export interface AuditResult {
  rootUrl: string;
  host: string;
  discovery: "llms.txt" | "sitemap" | "links" | "seed";
  pagesRequested: number;
  pagesCrawled: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  totalHtmlBytes: number;
  totalMarkdownBytes: number;
  tokensBefore: number;
  tokensAfter: number;
  hasLlmsTxt: boolean;
  topIssues: IssueRollup[];
  pages: AuditPage[];
  durationMs: number;
}

/** Extensions that are never HTML pages — skipped during discovery so crawl budget isn't wasted. */
const NON_PAGE_EXT =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|gz|tar|mp4|webm|mp3|wav|woff2?|ttf|eot)$/i;

const MAX_CONCURRENCY = 4;
const DISCOVERY_TIMEOUT_MS = 8000;

/** Strips the fragment and trailing slash so `/a`, `/a/`, and `/a#x` don't each burn a page slot. */
export function canonicalize(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host === new URL(b).host;
  } catch {
    return false;
  }
}

async function fetchText(url: string, timeoutMs = DISCOVERY_TIMEOUT_MS): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AgentReadBot/1.0; +https://agentread.dev/bot)",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Pulls the markdown links out of an llms.txt file — its whole purpose is to list canonical URLs. */
function urlsFromLlmsTxt(body: string, base: string): string[] {
  const out: string[] = [];
  const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(body))) {
    try {
      out.push(new URL(m[1], base).toString());
    } catch {
      /* skip malformed link */
    }
  }
  return out;
}

/** Reads <loc> entries; follows one level of sitemap-index nesting, which most large sites use. */
async function urlsFromSitemap(origin: string): Promise<string[]> {
  const body = await fetchText(`${origin}/sitemap.xml`);
  if (!body) return [];

  const locs = [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  if (locs.length === 0) return [];

  const isIndex = /<sitemapindex/i.test(body);
  if (!isIndex) return locs;

  // sitemap index — fetch the first few child sitemaps rather than all of them
  const children = locs.slice(0, 3);
  const nested: string[] = [];
  for (const child of children) {
    const childBody = await fetchText(child);
    if (!childBody) continue;
    nested.push(...[...childBody.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]));
  }
  return nested;
}

/** Last resort: scrape same-host anchor hrefs off the root page. */
async function urlsFromLinks(rootUrl: string): Promise<string[]> {
  const html = await fetchText(rootUrl, 12000);
  if (!html) return [];

  const { document: doc } = parseHTML(html);
  const hrefs = [...doc.querySelectorAll("a[href]")].map((a) =>
    (a as unknown as { getAttribute(n: string): string | null }).getAttribute("href")
  );

  const out: string[] = [];
  for (const href of hrefs) {
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      out.push(new URL(href, rootUrl).toString());
    } catch {
      /* skip malformed href */
    }
  }
  return out;
}

/**
 * Builds the crawl frontier, preferring the most authoritative source available:
 * llms.txt (the site's own sanctioned map) → sitemap.xml → on-page links → the root URL alone.
 */
export async function discoverUrls(
  rootUrl: string,
  limit: number
): Promise<{ urls: string[]; discovery: AuditResult["discovery"]; hasLlmsTxt: boolean }> {
  const origin = new URL(rootUrl).origin;

  const llmsBody = await fetchText(`${origin}/llms.txt`);
  const hasLlmsTxt = !!llmsBody && llmsBody.trim().length > 0;

  // Lazy on purpose: each source is only fetched if the preceding ones came up empty.
  // Evaluating all three eagerly cost a sitemap fetch plus a full root-page scrape on every
  // audit, even when llms.txt already had the answer.
  const sources: Array<{ discovery: AuditResult["discovery"]; load: () => Promise<string[]> }> = [];

  if (hasLlmsTxt) {
    sources.push({ discovery: "llms.txt", load: async () => urlsFromLlmsTxt(llmsBody, origin) });
  }
  sources.push({ discovery: "sitemap", load: () => urlsFromSitemap(origin) });
  sources.push({ discovery: "links", load: () => urlsFromLinks(rootUrl) });

  for (const source of sources) {
    const cleaned = dedupe(await source.load(), rootUrl, limit);
    if (cleaned.length > 0) {
      // always audit the root itself, even when discovery returned deeper pages
      const root = canonicalize(rootUrl);
      if (root && !cleaned.includes(root)) cleaned.unshift(root);
      return { urls: cleaned.slice(0, limit), discovery: source.discovery, hasLlmsTxt };
    }
  }

  const root = canonicalize(rootUrl);
  return { urls: root ? [root] : [], discovery: "seed", hasLlmsTxt };
}

function dedupe(urls: string[], rootUrl: string, limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const c = canonicalize(raw);
    if (!c) continue;
    if (!sameHost(c, rootUrl)) continue;
    if (NON_PAGE_EXT.test(new URL(c).pathname)) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length >= limit * 2) break; // gather a little slack, trimmed by the caller
  }
  return out;
}

/** Runs `worker` over `items` with a fixed number of parallel lanes. */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(lanes);
  return results;
}

/** Rolls per-page flags up into a site-level issue list, most frequent first. */
function rollUpIssues(pages: AuditPage[]): IssueRollup[] {
  const bySeverityRank = { high: 0, medium: 1, low: 2, ok: 3 } as const;
  const map = new Map<string, IssueRollup>();

  for (const page of pages) {
    for (const flag of page.flags) {
      if (flag.severity === "ok") continue;
      // Normalize the variable part of the script-count flag so it aggregates instead of
      // producing one distinct "issue" per page.
      const key = flag.text.replace(/^\d+ <script>/, "N <script>");
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { text: key, severity: flag.severity, count: 1 });
    }
  }

  return [...map.values()].sort(
    (a, b) => bySeverityRank[a.severity] - bySeverityRank[b.severity] || b.count - a.count
  );
}

export async function auditSite(
  rootUrl: string,
  opts: { pages?: number } = {}
): Promise<AuditResult> {
  const t0 = Date.now();
  const limit = Math.max(1, Math.min(opts.pages ?? 10, 200));

  const normalizedRoot = canonicalize(
    /^https?:\/\//i.test(rootUrl.trim()) ? rootUrl.trim() : `https://${rootUrl.trim()}`
  );
  if (!normalizedRoot) throw new Error("Invalid URL");

  const host = new URL(normalizedRoot).host;
  const { urls, discovery, hasLlmsTxt } = await discoverUrls(normalizedRoot, limit);

  if (urls.length === 0) {
    throw new Error("Could not discover any crawlable pages on this host.");
  }

  const pages = await mapWithConcurrency(urls, MAX_CONCURRENCY, async (url): Promise<AuditPage> => {
    try {
      const r = await readUrl(url);
      return {
        url: r.url,
        title: r.title,
        ok: true,
        readScore: r.readScore,
        hallucinationRisk: r.hallucinationRisk,
        htmlBytes: r.htmlBytes,
        markdownBytes: r.markdownBytes,
        tokensBefore: r.tokensBefore,
        tokensAfter: r.tokensAfter,
        markdown: r.markdown,
        flags: r.flags,
        latencyMs: r.latencyMs,
      };
    } catch (err) {
      return {
        url,
        title: url,
        ok: false,
        error: err instanceof Error ? err.message : "Failed to read page",
        readScore: 0,
        hallucinationRisk: "high",
        htmlBytes: 0,
        markdownBytes: 0,
        tokensBefore: 0,
        tokensAfter: 0,
        markdown: "",
        flags: [],
        latencyMs: 0,
      };
    }
  });

  const scored = pages.filter((p) => p.ok);
  // A site where every page failed to fetch is a failed audit, not a site that scores 0 —
  // reporting 0 would read as a real (terrible) score rather than "we couldn't reach it".
  if (scored.length === 0) {
    throw new Error("Every discovered page failed to fetch — the host may be blocking crawlers.");
  }

  const scores = scored.map((p) => p.readScore);

  return {
    rootUrl: normalizedRoot,
    host,
    discovery,
    pagesRequested: limit,
    pagesCrawled: scored.length,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    totalHtmlBytes: scored.reduce((a, p) => a + p.htmlBytes, 0),
    totalMarkdownBytes: scored.reduce((a, p) => a + p.markdownBytes, 0),
    tokensBefore: scored.reduce((a, p) => a + p.tokensBefore, 0),
    tokensAfter: scored.reduce((a, p) => a + p.tokensAfter, 0),
    hasLlmsTxt,
    topIssues: rollUpIssues(scored),
    pages,
    durationMs: Date.now() - t0,
  };
}
