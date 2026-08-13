/**
 * Batch-audit script — scans a list of sites with the existing engine and aggregates
 * agent-readability stats, for the "we audited N sites" launch report pattern from the SEO
 * research. Takes a plain text file, one URL per line. Run:
 *
 *   npx tsx scripts/batch-audit.ts sites.txt
 *
 * Every number this prints comes from a real live crawl — no placeholder data. If a site
 * fails to crawl, it's reported as a failure, not silently dropped from the denominator.
 */
import { readFileSync, writeFileSync } from "fs";
import { readUrl } from "../src/lib/engine/read";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/batch-audit.ts <urls.txt>");
    process.exit(1);
  }

  const urls = readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  const results: Array<{
    url: string;
    ok: boolean;
    readScore?: number;
    hasLlmsTxt?: boolean;
    hasEmptyShell?: boolean;
    hasJsOnlyContent?: boolean;
    hasDisabledCta?: boolean;
    error?: string;
  }> = [];

  for (const url of urls) {
    process.stderr.write(`Scanning ${url}... `);
    try {
      const r = await readUrl(url, { fresh: true });
      // Match on severity + text, not text alone — "No /llms.txt found" and "/llms.txt
      // found and reachable" both contain the substring "llms.txt found", so a text-only
      // match reports every site as having one regardless of the real result.
      const hasOkFlag = (needle: string) =>
        r.flags.some((f) => f.severity === "ok" && f.text.toLowerCase().includes(needle));
      const hasIssueFlag = (needle: string) =>
        r.flags.some((f) => f.severity !== "ok" && f.text.toLowerCase().includes(needle));
      results.push({
        url,
        ok: true,
        readScore: r.readScore,
        hasLlmsTxt: hasOkFlag("llms.txt"),
        hasEmptyShell: hasIssueFlag("very little text content"),
        hasJsOnlyContent: hasIssueFlag("price/cta keywords"),
        hasDisabledCta: hasIssueFlag("buy/checkout button appears disabled"),
      });
      process.stderr.write(`ReadScore ${r.readScore}\n`);
    } catch (err) {
      results.push({ url, ok: false, error: err instanceof Error ? err.message : "failed" });
      process.stderr.write(`FAILED\n`);
    }
  }

  const ok = results.filter((r) => r.ok);
  const summary = {
    totalScanned: results.length,
    successfullyCrawled: ok.length,
    avgReadScore: ok.length ? Math.round(ok.reduce((s, r) => s + (r.readScore ?? 0), 0) / ok.length) : null,
    pctMissingLlmsTxt: ok.length ? Math.round((ok.filter((r) => !r.hasLlmsTxt).length / ok.length) * 100) : null,
    pctEmptyShell: ok.length ? Math.round((ok.filter((r) => r.hasEmptyShell).length / ok.length) * 100) : null,
    pctJsOnlyContent: ok.length ? Math.round((ok.filter((r) => r.hasJsOnlyContent).length / ok.length) * 100) : null,
    pctDisabledCta: ok.length ? Math.round((ok.filter((r) => r.hasDisabledCta).length / ok.length) * 100) : null,
  };

  const out = { summary, results };
  writeFileSync("batch-audit-results.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main();
