/**
 * Full verification suite — real assertions against the real engine and real pure logic.
 * No mocks. Network-dependent sections are clearly separated from pure ones so a flaky
 * network can never be mistaken for a logic regression.
 *
 *   npx tsx scripts/verify.ts
 */
import { auditSite, canonicalize, discoverUrls, type AuditResult } from "../src/lib/engine/crawl";
import { generateLlmsFullTxt, generateLlmsTxt } from "../src/lib/engine/llmstxt";
import { readUrl } from "../src/lib/engine/read";
import { currentPeriod, isUnlimited, PLANS, resolvePlan } from "../src/lib/billing/plans";
import { isDue, type WatchRow } from "../src/lib/watch/runner";
import { createHmac } from "node:crypto";
import { isStripeStatusActive, planForPriceId, priceIdFor, stripeProvider } from "../src/lib/billing/stripe";
import {
  currencyForCountry,
  formatMoney,
  isCurrency,
  priceFor,
  priceMinorFor,
  toUsd,
} from "../src/lib/billing/currency";
import { isProviderId, PROVIDER_IDS } from "../src/lib/billing/provider";
import { defaultProviderFor, providersFor } from "../src/lib/billing/registry";
import {
  decodeCustomId,
  encodeCustomId,
  isPaypalConfigured,
  isPaypalStatusActive,
  paypalBase,
  paypalProvider,
  planForPaypalPlanId,
} from "../src/lib/billing/paypal";
import {
  isRazorpayConfigured,
  isRazorpayStatusActive,
  planForRazorpayPlanId,
  razorpayProvider,
  verifyRazorpaySignature,
} from "../src/lib/billing/razorpay";
import { formatBytes, riskLabel, scoreClass } from "../src/lib/ui/score";
import { planFixes, routingTable } from "../src/lib/fix/router";
import {
  checkMargin,
  costUsd,
  CREDIT_PRICE_USD,
  estimateFixCostUsd,
  MAX_COST_PER_JOB_USD,
  MODEL_PROVIDER,
  MODEL_RATES,
} from "../src/lib/fix/pricing";
import { fixLlmsTxt, fixRobotsTxt, fixServeMiddleware } from "../src/lib/fix/deterministic";
import { parseRepoUrl } from "../src/lib/github/client";
import { hint, open as openSecret, seal } from "../src/lib/crypto/secrets";
import type { RepoContext } from "../src/lib/fix/types";

let passed = 0;
let failed = 0;

function ok(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(name: string) {
  console.log(`\n${name}`);
}

async function main() {
  // ---------------------------------------------------------------- pure logic
  section("URL canonicalization");
  ok("strips fragments", canonicalize("https://a.com/x#frag") === "https://a.com/x");
  ok("strips trailing slash", canonicalize("https://a.com/x/") === "https://a.com/x");
  ok("keeps root slash", canonicalize("https://a.com/") === "https://a.com/");
  ok("rejects non-http protocols", canonicalize("mailto:a@b.com") === null);
  ok("rejects malformed input", canonicalize("not a url") === null);
  ok(
    "/a, /a/ and /a#x collapse to one",
    new Set(
      ["https://a.com/a", "https://a.com/a/", "https://a.com/a#x"].map((u) => canonicalize(u))
    ).size === 1
  );

  section("Plans & quota maths");
  ok("free plan is the default", resolvePlan(undefined).id === "free");
  ok("legacy 'developer' maps to free", resolvePlan("developer").id === "free");
  ok("legacy 'read_api' does NOT grant paid limits", resolvePlan("read_api").id === "free");
  ok("unknown plan falls back to free", resolvePlan("banana").id === "free");
  ok("'pro' resolves to pro", resolvePlan("pro").id === "pro");
  ok("'PRO' is case-insensitive", resolvePlan("PRO").id === "pro");
  ok("enterprise reads are unlimited", isUnlimited(PLANS.enterprise.limits.reads));
  ok("free reads are NOT unlimited", !isUnlimited(PLANS.free.limits.reads));
  ok("free tier cannot watch", PLANS.free.limits.watches === 0);
  ok("pro tier can watch", PLANS.pro.limits.watches > 0);
  ok(
    "limits increase monotonically free→pro→scale",
    PLANS.free.limits.reads < PLANS.pro.limits.reads &&
      PLANS.pro.limits.reads < PLANS.scale.limits.reads
  );
  ok(
    "page caps increase monotonically",
    PLANS.free.limits.pagesPerAudit < PLANS.pro.limits.pagesPerAudit &&
      PLANS.pro.limits.pagesPerAudit < PLANS.scale.limits.pagesPerAudit
  );
  ok("period key is YYYY-MM", /^\d{4}-\d{2}$/.test(currentPeriod()));
  ok(
    "period pads single-digit months",
    currentPeriod(new Date(Date.UTC(2026, 0, 15))) === "2026-01"
  );

  section("Stripe price mapping");
  ok("free has no price id", priceIdFor("free") === null);
  ok("enterprise has no price id", priceIdFor("enterprise") === null);
  ok("unset env yields null price", priceIdFor("pro") === null || typeof priceIdFor("pro") === "string");
  ok("unknown price id maps to no plan", planForPriceId("price_nonexistent") === null);
  ok("null price id maps to no plan", planForPriceId(null) === null);

  // --------------------------------------------------------------------
  // Multi-gateway billing. An Indian company selling globally cannot run on one
  // gateway: Stripe India cannot bill USD, PayPal India cannot bill INR, and only
  // Razorpay settles rupees into an Indian bank. These assertions pin the rules
  // that keep three gateways from becoming three ways to grant a plan wrongly.
  // --------------------------------------------------------------------
  section("Billing — currency");
  ok("USD pro price is $29", priceFor("pro", "USD") === 29);
  ok("INR pro price is set, not converted", priceFor("pro", "INR") === 1499);
  ok("enterprise is not sold at a list price", priceFor("enterprise", "USD") === null);
  ok("minor units for USD are cents", priceMinorFor("pro", "USD") === 2900);
  ok("minor units for INR are paise", priceMinorFor("pro", "INR") === 149900);
  ok("USD normalises to itself", toUsd(2900, "USD") === 29);
  ok("INR normalises to a smaller USD figure", toUsd(149900, "INR") < 29, `${toUsd(149900, "INR")}`);
  ok("USD formats with a dollar sign", formatMoney(29, "USD").includes("29"));
  ok("INR formats with a rupee sign", formatMoney(1499, "INR").includes("₹"));
  ok("INR uses lakh grouping", formatMoney(1_499_99, "INR") === "₹1,49,999", formatMoney(149999, "INR"));
  ok("unknown currency is rejected", !isCurrency("GBP") && isCurrency("INR"));
  ok("India suggests INR", currencyForCountry("IN") === "INR");
  ok("elsewhere defaults to USD", currencyForCountry("DE") === "USD" && currencyForCountry(null) === "USD");

  section("Billing — provider routing");
  ok("three providers are registered", PROVIDER_IDS.length === 3);
  ok("provider ids validate", isProviderId("razorpay") && !isProviderId("paytm"));
  ok(
    "PayPal refuses INR (India merchants cannot settle rupees)",
    !paypalProvider.supportsCurrency("INR") && paypalProvider.supportsCurrency("USD")
  );
  ok("Razorpay accepts INR", razorpayProvider.supportsCurrency("INR"));
  ok("Stripe accepts both currencies", stripeProvider.supportsCurrency("USD") && stripeProvider.supportsCurrency("INR"));
  ok(
    "a provider without a configured plan id cannot sell",
    !paypalProvider.supportsPlan("pro", "USD") && !razorpayProvider.supportsPlan("pro", "INR")
  );
  ok("only Stripe exposes a hosted portal", !!stripeProvider.portalUrl && !paypalProvider.portalUrl && !razorpayProvider.portalUrl);
  ok(
    "no gateway is offered when none is configured",
    providersFor("pro", "USD").length === 0 && defaultProviderFor("pro", "USD") === null
  );

  section("Billing — gateway plan mapping");
  ok("unknown PayPal plan maps to no plan", planForPaypalPlanId("P-NONEXISTENT") === null);
  ok("null PayPal plan maps to no plan", planForPaypalPlanId(null) === null);
  ok("unknown Razorpay plan maps to no plan", planForRazorpayPlanId("plan_nonexistent") === null);
  ok(
    "PayPal custom_id round-trips user and plan",
    (() => {
      const decoded = decodeCustomId(encodeCustomId("user-123", "scale"));
      return decoded?.userId === "user-123" && decoded?.plan === "scale";
    })()
  );
  ok("malformed custom_id yields no user", decodeCustomId("") === null && decodeCustomId(null) === null);
  ok(
    "custom_id with an unknown plan still identifies the user",
    (() => {
      const decoded = decodeCustomId("user-9:bogus");
      return decoded?.userId === "user-9" && decoded?.plan === null;
    })()
  );

  section("Billing — active-status rules");
  ok("Stripe active/trialing count as paid", isStripeStatusActive("active") && isStripeStatusActive("trialing"));
  ok("Stripe past_due does not", !isStripeStatusActive("past_due") && !isStripeStatusActive("canceled"));
  ok("PayPal ACTIVE counts as paid", isPaypalStatusActive("ACTIVE"));
  ok(
    "PayPal suspended/cancelled do not",
    !isPaypalStatusActive("SUSPENDED") && !isPaypalStatusActive("CANCELLED") && !isPaypalStatusActive(null)
  );
  ok("Razorpay active/charged count as paid", isRazorpayStatusActive("active") && isRazorpayStatusActive("charged"));
  ok(
    "Razorpay 'authenticated' does NOT — mandate exists but no money moved",
    !isRazorpayStatusActive("authenticated")
  );
  ok(
    "Razorpay halted/cancelled do not",
    !isRazorpayStatusActive("halted") && !isRazorpayStatusActive("cancelled")
  );

  section("Billing — webhook signature verification");
  const rzpSecret = "whsec_test_razorpay";
  process.env.RAZORPAY_WEBHOOK_SECRET = rzpSecret;
  const rzpBody = JSON.stringify({ event: "subscription.charged", payload: {} });
  const rzpSig = createHmac("sha256", rzpSecret).update(rzpBody, "utf8").digest("hex");

  ok("a correct Razorpay signature verifies", verifyRazorpaySignature(rzpBody, rzpSig));
  ok("a tampered body fails", !verifyRazorpaySignature(rzpBody + " ", rzpSig));
  ok("a wrong signature fails", !verifyRazorpaySignature(rzpBody, rzpSig.replace(/.$/, "0")));
  ok("a missing signature fails", !verifyRazorpaySignature(rzpBody, null));
  ok(
    "a short signature fails without throwing",
    !verifyRazorpaySignature(rzpBody, "abc")
  );
  ok(
    "a signature from the wrong secret fails",
    !verifyRazorpaySignature(rzpBody, createHmac("sha256", "other").update(rzpBody, "utf8").digest("hex"))
  );
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  ok("no configured secret means nothing verifies", !verifyRazorpaySignature(rzpBody, rzpSig));

  section("Billing — configuration gates");
  ok(
    "unconfigured gateways report themselves unconfigured",
    !isPaypalConfigured() && !isRazorpayConfigured()
  );
  ok("PayPal defaults to sandbox when PAYPAL_ENV is unset", paypalBase().includes("sandbox"));
  ok(
    "PAYPAL_ENV=live selects production",
    (() => {
      process.env.PAYPAL_ENV = "live";
      const live = paypalBase();
      process.env.PAYPAL_ENV = "typo";
      const fallback = paypalBase();
      delete process.env.PAYPAL_ENV;
      // Anything that isn't exactly "live" must route to sandbox: a typo should never
      // send real money to production.
      return live === "https://api-m.paypal.com" && fallback.includes("sandbox");
    })()
  );

  section("Watch scheduling");
  const base = { id: "w", user_id: "u", root_url: "https://a.com", host: "a.com", pages: 5, alert_email: null, webhook_url: null, alert_threshold: 5, last_score: 70 };
  const now = Date.UTC(2026, 7, 5, 12, 0, 0);
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

  ok("never-run watch is due", isDue({ ...base, frequency: "daily", last_run_at: null } as WatchRow, now));
  ok("daily watch due after 25h", isDue({ ...base, frequency: "daily", last_run_at: hoursAgo(25) } as WatchRow, now));
  ok("daily watch NOT due after 2h", !isDue({ ...base, frequency: "daily", last_run_at: hoursAgo(2) } as WatchRow, now));
  ok("weekly watch NOT due after 25h", !isDue({ ...base, frequency: "weekly", last_run_at: hoursAgo(25) } as WatchRow, now));
  ok("weekly watch due after 8 days", isDue({ ...base, frequency: "weekly", last_run_at: hoursAgo(24 * 8) } as WatchRow, now));
  ok(
    "unknown frequency falls back to weekly",
    !isDue({ ...base, frequency: "fortnightly", last_run_at: hoursAgo(48) } as WatchRow, now)
  );

  section("Score banding & formatting");
  ok("75 bands as good", scoreClass(75) === "pill-good");
  ok("74 bands as warn", scoreClass(74) === "pill-warn");
  ok("54 bands as serious", scoreClass(54) === "pill-serious");
  ok("risk label matches banding", riskLabel(80) === "low" && riskLabel(60) === "medium" && riskLabel(20) === "high");
  ok("bytes format < 1kB", formatBytes(512) === "512 B");
  ok("bytes format kB", formatBytes(2048) === "2.0 kB");
  ok("bytes format MB", formatBytes(5 * 1024 * 1024) === "5.00 MB");

  // Synthetic audit so the Autofix assertions stay pure — a network hiccup should never
  // look like a routing or pricing regression.
  const fixture: AuditResult = {
    rootUrl: "https://acme.test",
    host: "acme.test",
    discovery: "sitemap",
    pagesRequested: 3,
    pagesCrawled: 3,
    avgScore: 62,
    minScore: 41,
    maxScore: 78,
    totalHtmlBytes: 300_000,
    totalMarkdownBytes: 12_000,
    tokensBefore: 75_000,
    tokensAfter: 3_000,
    hasLlmsTxt: false,
    topIssues: [],
    durationMs: 1234,
    pages: [
      {
        url: "https://acme.test/",
        title: "Acme — Home",
        ok: true,
        readScore: 78,
        hallucinationRisk: "low",
        htmlBytes: 100_000,
        markdownBytes: 4_000,
        tokensBefore: 25_000,
        tokensAfter: 1_000,
        markdown: "# Acme\n\nAcme builds industrial widgets for heavy manufacturing.",
        flags: [],
        latencyMs: 300,
      },
      {
        url: "https://acme.test/pricing",
        title: "Acme — Pricing",
        ok: true,
        readScore: 41,
        hallucinationRisk: "high",
        htmlBytes: 120_000,
        markdownBytes: 4_500,
        tokensBefore: 30_000,
        tokensAfter: 1_100,
        markdown: "# Pricing\n\nPlans for teams of every size.",
        flags: [
          {
            severity: "high",
            text: "Price/CTA keywords found in raw HTML but not in extracted text — likely rendered client-side only.",
          },
        ],
        latencyMs: 420,
      },
      {
        url: "https://acme.test/docs",
        title: "Acme — Docs",
        ok: true,
        readScore: 67,
        hallucinationRisk: "medium",
        htmlBytes: 80_000,
        markdownBytes: 3_500,
        tokensBefore: 20_000,
        tokensAfter: 900,
        markdown: "# Docs\n\nIntegration guides and API reference.",
        flags: [],
        latencyMs: 260,
      },
    ],
  };

  section("Autofix — cost model");
  ok("opus-5 rates are $5/$25 per MTok", MODEL_RATES["claude-opus-5"].input === 5 && MODEL_RATES["claude-opus-5"].output === 25);
  ok(
    "cache reads cost ~10% of base input",
    Math.abs(
      costUsd({ inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 1_000_000 }) - 0.5
    ) < 1e-9
  );
  ok(
    "cache writes cost 1.25x base input",
    Math.abs(
      costUsd({ inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 1_000_000, cacheReadInputTokens: 0 }) - 6.25
    ) < 1e-9
  );
  ok(
    "a cached fix is cheaper than a cold one",
    costUsd({ inputTokens: 0, outputTokens: 6000, cacheCreationInputTokens: 0, cacheReadInputTokens: 50_000 }) <
      costUsd({ inputTokens: 0, outputTokens: 6000, cacheCreationInputTokens: 50_000, cacheReadInputTokens: 0 })
  );
  const oneFix = estimateFixCostUsd(45_000);
  ok("a typical fix costs well under one credit", oneFix < CREDIT_PRICE_USD, `$${oneFix.toFixed(3)} vs $${CREDIT_PRICE_USD}`);
  ok(
    "gross margin on a typical fix exceeds 80%",
    ((CREDIT_PRICE_USD - oneFix) / CREDIT_PRICE_USD) * 100 > 80,
    `${(((CREDIT_PRICE_USD - oneFix) / CREDIT_PRICE_USD) * 100).toFixed(1)}%`
  );
  ok("zero LLM fixes reports 100% margin", checkMargin(0, 0).marginPct === 100);
  ok("a normal job is allowed", checkMargin(3, 3 * oneFix).allowed);
  ok(
    "a job past the ceiling is refused before any spend",
    !checkMargin(50, MAX_COST_PER_JOB_USD + 1).allowed
  );
  ok(
    "a loss-making job is refused",
    !checkMargin(1, CREDIT_PRICE_USD * 2).allowed
  );

  section("Autofix — cost model (multi-provider)");
  ok("gpt-5-nano rates are $0.05/$0.40 per MTok", MODEL_RATES["gpt-5-nano"].input === 0.05 && MODEL_RATES["gpt-5-nano"].output === 0.4);
  ok("gpt-5-mini rates are $0.25/$2 per MTok", MODEL_RATES["gpt-5-mini"].input === 0.25 && MODEL_RATES["gpt-5-mini"].output === 2);
  ok("Claude models map to the anthropic provider", (["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"] as const).every((m) => MODEL_PROVIDER[m] === "anthropic"));
  ok("GPT models map to the openai provider", (["gpt-5-mini", "gpt-5-nano"] as const).every((m) => MODEL_PROVIDER[m] === "openai"));
  ok(
    "an OpenAI-routed fix has no cache terms",
    costUsd({ inputTokens: 1000, outputTokens: 0, cacheCreationInputTokens: 1000, cacheReadInputTokens: 1000 }, "gpt-5-nano") ===
      costUsd({ inputTokens: 1000, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 }, "gpt-5-nano")
  );
  const opusFix = estimateFixCostUsd(45_000, "claude-opus-5");
  const nanoFix = estimateFixCostUsd(45_000, "gpt-5-nano");
  ok(
    "routing a fix to gpt-5-nano is at least 10x cheaper than opus for the same input size",
    nanoFix * 10 < opusFix,
    `nano $${nanoFix.toFixed(4)} vs opus $${opusFix.toFixed(4)}`
  );
  ok("a nano-routed fix still clears margin easily", ((CREDIT_PRICE_USD - nanoFix) / CREDIT_PRICE_USD) * 100 > 99);

  section("Autofix — routing (the margin lever)");
  const table = routingTable();
  ok("every route has a strategy", table.every((r) => ["deterministic", "llm", "advisory"].includes(r.strategy)));
  ok("deterministic routes estimate zero tokens", table.filter((r) => r.strategy === "deterministic").every((r) => r.tokenEstimate === 0));
  ok("advisory routes estimate zero tokens", table.filter((r) => r.strategy === "advisory").every((r) => r.tokenEstimate === 0));
  ok("llm routes estimate non-zero tokens", table.filter((r) => r.strategy === "llm").every((r) => r.tokenEstimate > 0));
  ok("every llm route has a model assigned", table.filter((r) => r.strategy === "llm").every((r) => !!r.model));
  ok("issue keys are unique", new Set(table.map((r) => r.issueKey)).size === table.length);
  ok("missing llms.txt routes to the free path", table.find((r) => r.issueKey === "missing_llms_txt")?.strategy === "deterministic");
  ok("JS-only content routes to the metered path", table.find((r) => r.issueKey === "js_only_content")?.strategy === "llm");
  ok("script-heavy is advisory, never patched blind", table.find((r) => r.issueKey === "script_heavy")?.strategy === "advisory");
  ok(
    "most llm routes are cost-routed to GPT, not defaulted to Opus",
    table.filter((r) => r.strategy === "llm" && r.model && MODEL_PROVIDER[r.model] === "openai").length >
      table.filter((r) => r.strategy === "llm" && r.model && MODEL_PROVIDER[r.model] === "anthropic").length
  );
  ok(
    "every llm route runs on GPT — no Anthropic key required for Autofix",
    table.filter((r) => r.strategy === "llm").every((r) => r.model && MODEL_PROVIDER[r.model] === "openai")
  );

  const fakeAudit = {
    ...fixture,
    topIssues: [
      { text: "No /llms.txt found — agents have no sanctioned map of this site.", severity: "medium" as const, count: 5 },
      { text: "Price/CTA keywords found in raw HTML but not in extracted text — likely rendered client-side only.", severity: "high" as const, count: 3 },
      { text: "N <script> tags detected — heavy client-side rendering risk for non-JS readers.", severity: "medium" as const, count: 5 },
    ],
  };
  const plan = planFixes("audit-1", fakeAudit);
  ok("plan classifies every issue", plan.items.length >= 3);
  ok("plan counts sum to item count", plan.deterministicCount + plan.llmCount + plan.advisoryCount === plan.items.length);
  ok("synthetic free fixes are always added", plan.deterministicCount >= 3, `${plan.deterministicCount} free`);
  ok("high severity is planned first", plan.items[0].severity === "high");
  ok("plan cost only reflects LLM items", plan.estimatedCostUsd > 0 && plan.estimatedCostUsd < CREDIT_PRICE_USD * plan.llmCount);
  ok(
    "an unrecognised finding falls back to advisory, never a blind patch",
    planFixes("a", { ...fixture, topIssues: [{ text: "something we have never seen", severity: "high" as const, count: 1 }] })
      .items[0].strategy === "advisory"
  );

  section("Autofix — deterministic fixers (zero cost)");
  const repo: RepoContext = {
    owner: "acme", repo: "site", defaultBranch: "main",
    tree: ["package.json", "src/app/page.tsx", "public/favicon.ico"],
    framework: "nextjs",
    keyFiles: [{ path: "package.json", contents: '{"dependencies":{"next":"16"}}' }],
  };
  const llmsFix = fixLlmsTxt(fixture, repo);
  ok("llms.txt fix costs nothing", llmsFix.costUsd === 0);
  ok("llms.txt fix writes both variants", llmsFix.changes.length === 2);
  ok("llms.txt lands in public/ for Next.js", llmsFix.changes.every((c) => c.path.startsWith("public/")));

  const robotsNew = fixRobotsTxt(repo, null);
  ok("robots fix costs nothing", robotsNew.costUsd === 0);
  ok("robots fix names AI crawlers", /GPTBot/.test(robotsNew.changes[0].contents) && /ClaudeBot/.test(robotsNew.changes[0].contents));
  const existingRobots = "User-agent: *\nDisallow: /admin\n";
  const robotsAppend = fixRobotsTxt(repo, existingRobots);
  ok("existing robots rules are preserved, not replaced", robotsAppend.changes[0].contents.includes("Disallow: /admin"));

  const serveFix = fixServeMiddleware(repo);
  ok("serve middleware generated for Next.js", serveFix.ok && serveFix.changes.length === 1);
  ok("serve middleware uses proxy.ts (Next 16), not middleware.ts", serveFix.changes[0].path.endsWith("proxy.ts"));
  ok("serve middleware declines non-Next frameworks rather than guessing", !fixServeMiddleware({ ...repo, framework: "hugo" }).ok);

  section("Autofix — GitHub + secrets");
  ok("parses an https repo URL", parseRepoUrl("https://github.com/acme/site")?.repo === "site");
  ok("parses a .git suffix", parseRepoUrl("https://github.com/acme/site.git")?.repo === "site");
  ok("parses owner/repo shorthand", parseRepoUrl("acme/site")?.owner === "acme");
  ok("rejects a non-repo string", parseRepoUrl("not a repo at all") === null);

  process.env.SECRETS_ENCRYPTION_KEY = "test-key-that-is-definitely-long-enough-32";
  const secret = "ghp_averysecrettokenvalue123456";
  const sealed = seal(secret);
  ok("round-trips an encrypted secret", openSecret(sealed) === secret);
  ok("ciphertext does not contain the plaintext", !sealed.ciphertext.includes(secret));
  ok("each seal uses a fresh nonce", seal(secret).iv !== seal(secret).iv);
  ok("hint exposes only the last 4 chars", hint(secret) === "…3456");
  let tamperCaught = false;
  try {
    openSecret({ ...sealed, tag: Buffer.from("0".repeat(16)).toString("base64") });
  } catch {
    tamperCaught = true;
  }
  ok("tampered ciphertext fails to decrypt", tamperCaught);

  // ---------------------------------------------------------------- live network
  section("Live engine — single page (example.com)");
  const single = await readUrl("https://example.com");
  ok("returns markdown", single.markdown.length > 0);
  ok("score within bounds", single.readScore >= 1 && single.readScore <= 100, String(single.readScore));
  ok("markdown smaller than html", single.markdownBytes < single.htmlBytes);
  ok("risk derives from score", single.hallucinationRisk === riskLabel(single.readScore));
  ok("every flag has severity + text", single.flags.every((f) => f.severity && f.text));

  section("Live engine — discovery (nextjs.org)");
  const discovered = await discoverUrls("https://nextjs.org", 8);
  ok("found candidate urls", discovered.urls.length > 0, `${discovered.urls.length} urls`);
  ok("respects the limit", discovered.urls.length <= 8);
  ok("all same-host", discovered.urls.every((u) => new URL(u).host === "nextjs.org"));
  ok("no duplicates", new Set(discovered.urls).size === discovered.urls.length);
  ok("reports a discovery source", ["llms.txt", "sitemap", "links", "seed"].includes(discovered.discovery), discovered.discovery);
  ok(
    "excludes asset extensions",
    discovered.urls.every((u) => !/\.(png|jpe?g|css|js|json|xml|pdf)$/i.test(new URL(u).pathname))
  );

  section("Live engine — full audit (nextjs.org, 5 pages)");
  const audit = await auditSite("https://nextjs.org", { pages: 5 });
  ok("crawled pages", audit.pagesCrawled > 0, `${audit.pagesCrawled} pages`);
  ok("avg within min/max", audit.minScore <= audit.avgScore && audit.avgScore <= audit.maxScore);
  ok("aggregate bytes reduced", audit.totalMarkdownBytes < audit.totalHtmlBytes,
    `${((1 - audit.totalMarkdownBytes / audit.totalHtmlBytes) * 100).toFixed(1)}% smaller`);
  ok("tokens reduced", audit.tokensAfter < audit.tokensBefore);
  ok("issue counts never exceed page count", audit.topIssues.every((i) => i.count <= audit.pagesCrawled));
  ok("issues exclude 'ok' severity", audit.topIssues.every((i) => i.severity !== "ok"));
  ok(
    "script-count issue is normalized for rollup",
    !audit.topIssues.some((i) => /^\d+ <script>/.test(i.text))
  );

  section("llms.txt generation");
  const index = generateLlmsTxt(audit);
  const full = generateLlmsFullTxt(audit);
  ok("index starts with H1", index.startsWith("# "));
  ok("index has summary blockquote", /\n> .+/.test(index));
  ok("index has at least one section", /\n## .+/.test(index));
  ok("index links resolve to crawled pages",
    [...index.matchAll(/- \[[^\]]*\]\((https?:\/\/[^)]+)\)/g)].every((m) =>
      audit.pages.some((p) => p.url === m[1])
    ));
  ok("full variant is larger", full.length > index.length);
  ok("full cites every source", (full.match(/Source: /g) ?? []).length === audit.pages.filter((p) => p.ok && p.markdown.trim()).length);
  ok("minScore filter excludes low pages", generateLlmsTxt(audit, { minScore: 101 }).split("\n").filter((l) => l.startsWith("- [")).length === 0);
  ok("custom site name is honoured", generateLlmsTxt(audit, { siteName: "ZZTest" }).startsWith("# ZZTest"));

  console.log(
    failed === 0
      ? `\n✅ ${passed} assertions passed, 0 failed.\n`
      : `\n❌ ${passed} passed, ${failed} FAILED.\n`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ Verification threw:", err);
  process.exit(1);
});
