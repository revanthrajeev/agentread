/**
 * Engine smoke test — runs the real crawl + llms.txt generators against live sites.
 * No database, no auth, no Next.js server: this exercises the pure engine only.
 *
 *   npx tsx scripts/verify-engine.ts [url] [pages]
 */
import { auditSite } from "../src/lib/engine/crawl";
import { generateLlmsFullTxt, generateLlmsTxt } from "../src/lib/engine/llmstxt";

const target = process.argv[2] ?? "https://example.com";
const pages = Number(process.argv[3] ?? 5);

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log(`\nAuditing ${target} (max ${pages} pages)…\n`);
  const t0 = Date.now();
  const audit = await auditSite(target, { pages });
  const elapsed = Date.now() - t0;

  console.log(`Discovery: ${audit.discovery} · crawled ${audit.pagesCrawled}/${audit.pagesRequested} in ${elapsed}ms`);
  console.log(`Score: avg ${audit.avgScore} (min ${audit.minScore}, max ${audit.maxScore}) · llms.txt: ${audit.hasLlmsTxt}`);
  console.log(
    `Payload: ${(audit.totalHtmlBytes / 1024).toFixed(1)}kB HTML → ${(audit.totalMarkdownBytes / 1024).toFixed(1)}kB MD · ` +
      `${audit.tokensBefore.toLocaleString()} → ${audit.tokensAfter.toLocaleString()} tokens`
  );

  console.log("\nAssertions:");
  check("crawled at least one page", audit.pagesCrawled >= 1, `${audit.pagesCrawled} pages`);
  check("avg score in 1..100", audit.avgScore >= 1 && audit.avgScore <= 100, String(audit.avgScore));
  check("min <= avg <= max", audit.minScore <= audit.avgScore && audit.avgScore <= audit.maxScore);
  check("every crawled page has a URL", audit.pages.every((p) => !!p.url));
  check("all pages are same-host", audit.pages.every((p) => new URL(p.url).host === audit.host));
  check("no duplicate URLs", new Set(audit.pages.map((p) => p.url)).size === audit.pages.length);
  check(
    "markdown is smaller than html",
    audit.totalMarkdownBytes < audit.totalHtmlBytes,
    `${((1 - audit.totalMarkdownBytes / audit.totalHtmlBytes) * 100).toFixed(1)}% reduction`
  );
  check("token count dropped", audit.tokensAfter < audit.tokensBefore);
  check("issues rolled up with counts", audit.topIssues.every((i) => i.count >= 1));

  const llms = generateLlmsTxt(audit);
  const full = generateLlmsFullTxt(audit);

  console.log("\nllms.txt:");
  check("starts with an H1", llms.startsWith("# "));
  check("has a summary blockquote", /\n> .+/.test(llms));
  check("contains at least one markdown link", /- \[.+\]\(https?:\/\/.+\)/.test(llms));
  check(
    "links only to crawled pages",
    [...llms.matchAll(/- \[[^\]]*\]\((https?:\/\/[^)]+)\)/g)].every((m) =>
      audit.pages.some((p) => p.url === m[1])
    )
  );
  check("llms-full.txt is larger than the index", full.length > llms.length);
  check("llms-full.txt cites its sources", full.includes("Source: "));

  console.log("\n--- llms.txt (first 24 lines) ---");
  console.log(llms.split("\n").slice(0, 24).join("\n"));

  if (audit.topIssues.length) {
    console.log("\n--- top issues ---");
    for (const issue of audit.topIssues.slice(0, 5)) {
      console.log(`  [${issue.severity}] ×${issue.count}  ${issue.text}`);
    }
  }

  console.log(failures === 0 ? "\n✅ All engine assertions passed.\n" : `\n❌ ${failures} assertion(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ Engine run threw:", err);
  process.exit(1);
});
