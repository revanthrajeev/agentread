import type { ReadFlag } from "./read";

export interface SeoResult {
  seoScore: number;
  seoFlags: ReadFlag[];
}

/**
 * Traditional on-page SEO signals — the checks a human-search-engine crawler cares about,
 * as opposed to readScore's agent-readability signals. Deliberately kept separate rather
 * than folded into readScore: they measure different audiences (Googlebot ranking factors
 * vs. an LLM agent's ability to extract clean content) and a page can legitimately score
 * high on one and low on the other — that gap is the whole point of exposing both.
 *
 * Deterministic, no LLM cost — computed from the same parsed document readUrl() already
 * fetched, same pattern as readScore's heuristic.
 */
export function computeSeoScore(doc: Document, html: string): SeoResult {
  let score = 100;
  const flags: ReadFlag[] = [];

  const title = doc.querySelector("title")?.textContent?.trim() ?? "";
  if (!title) {
    score -= 20;
    flags.push({ severity: "high", text: "No <title> tag found — the single strongest on-page ranking signal is missing." });
  } else if (title.length < 15 || title.length > 65) {
    score -= 8;
    flags.push({
      severity: "medium",
      text: `Title tag is ${title.length} characters — search engines typically truncate outside the 15-65 char range.`,
    });
  } else {
    flags.push({ severity: "ok", text: "Title tag length is within the recommended range." });
  }

  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? "";
  if (!metaDesc) {
    score -= 12;
    flags.push({ severity: "high", text: "No meta description — search engines will fall back to an auto-generated snippet." });
  } else if (metaDesc.length < 50 || metaDesc.length > 160) {
    score -= 5;
    flags.push({
      severity: "low",
      text: `Meta description is ${metaDesc.length} characters — outside the ~50-160 char range that avoids truncation.`,
    });
  }

  const h1s = doc.querySelectorAll("h1");
  if (h1s.length === 0) {
    score -= 15;
    flags.push({ severity: "high", text: "No <h1> found — pages need exactly one top-level heading for both SEO and accessibility." });
  } else if (h1s.length > 1) {
    score -= 8;
    flags.push({ severity: "medium", text: `${h1s.length} <h1> tags found — multiple top-level headings dilute topical signal.` });
  }

  const images = Array.from(doc.querySelectorAll("img"));
  const missingAlt = images.filter((img) => !img.getAttribute("alt")?.trim());
  if (images.length > 0 && missingAlt.length > 0) {
    const pct = Math.round((missingAlt.length / images.length) * 100);
    const penalty = Math.min(15, Math.round(pct / 10));
    score -= penalty;
    flags.push({
      severity: pct > 50 ? "high" : "medium",
      text: `${missingAlt.length}/${images.length} images (${pct}%) are missing alt text.`,
    });
  } else if (images.length > 0) {
    flags.push({ severity: "ok", text: "All images have alt text." });
  }

  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) {
    score -= 6;
    flags.push({ severity: "low", text: "No canonical tag — risk of duplicate-content signal dilution across URL variants." });
  }

  const viewport = doc.querySelector('meta[name="viewport"]');
  if (!viewport) {
    score -= 10;
    flags.push({ severity: "medium", text: "No viewport meta tag — mobile-friendliness is a direct ranking factor." });
  }

  const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
  if (/noindex/i.test(robotsMeta)) {
    score -= 40;
    flags.push({ severity: "high", text: "Page is marked noindex — it will not appear in search results at all." });
  }

  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  if (!hasJsonLd) {
    score -= 5;
    flags.push({ severity: "low", text: "No structured data (JSON-LD) found — missing rich-result eligibility." });
  } else {
    flags.push({ severity: "ok", text: "Structured data (JSON-LD) present." });
  }

  score = Math.max(1, Math.min(100, Math.round(score)));
  if (flags.every((f) => f.severity === "ok")) {
    flags.push({ severity: "ok", text: "No SEO issues detected." });
  }

  return { seoScore: score, seoFlags: flags };
}
