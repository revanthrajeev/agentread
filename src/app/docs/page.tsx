export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Docs</h1>

      <Section title="Quickstart">
        <p>Two free, no-auth endpoints power the site&apos;s own demos:</p>
        <Code>{`POST /api/scan   { "url": "https://example.com" }   → score only, no auth
POST /api/read   { "url": "https://example.com" }   → full markdown + score, 10 req/min per IP`}</Code>
        <p>For programmatic access, issue an API key in the dashboard and use the authenticated Read API:</p>
        <Code>{`POST /api/v1/read
Authorization: Bearer sk-ar-...
{ "url": "https://example.com" }   → full markdown + score, 60 req/min per key, persisted to your dashboard`}</Code>
      </Section>

      <Section title="MCP server">
        <p>
          A remote MCP server is live at <code className="rounded bg-white/10 px-1">/api/mcp</code> —
          add it to any MCP-capable client (Claude, ChatGPT connectors, custom agents) with the same
          API key as the bearer token. Exposes two tools:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><code className="rounded bg-white/10 px-1">read_url</code> — full markdown + ReadScore + flags</li>
          <li><code className="rounded bg-white/10 px-1">score_url</code> — score + flags only, cheaper when content isn&apos;t needed</li>
        </ul>
      </Section>

      <Section title="Response shape">
        <Code>{`{
  "url": "https://example.com/pricing",
  "title": "Pricing",
  "markdown": "# Pricing\\n\\n...",
  "readScore": 82,
  "hallucinationRisk": "low",
  "flags": [{ "severity": "low", "text": "..." }],
  "htmlBytes": 812000,
  "markdownBytes": 8100,
  "tokensBefore": 203114,
  "tokensAfter": 1942,
  "latencyMs": 84,
  "cache": "MISS"
}`}</Code>
      </Section>

      <Section title="How ReadScore is computed">
        <p>
          Fully transparent — starts at 100, then deducts for: low payload reduction, high script
          count (&gt;25 tags), price/CTA text present in raw HTML but absent from extracted text
          (JS-only rendering), disabled buy/checkout buttons in markup, lazy-loaded content, and a
          missing <code className="rounded bg-white/10 px-1">/llms.txt</code>. Every deduction ships
          as a human-readable flag alongside the score.
        </p>
      </Section>

      <Section title="Rate limits">
        <p>10 reads/minute per IP on the public playground (<code className="rounded bg-white/10 px-1">/api/read</code>, <code className="rounded bg-white/10 px-1">/api/scan</code>). 60 reads/minute per API key on the authenticated API and MCP server.</p>
      </Section>

      <Section title="Roadmap">
        <ul className="list-disc space-y-1 pl-5">
          <li>More MCP tools: batch, map_site, extract_data</li>
          <li>Serve middleware (Next.js) for site owners</li>
          <li>Crawl, Watch, llms.txt Studio, agent analytics</li>
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-white/10 pt-8 first:mt-6 first:border-0 first:pt-0">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-bold">{title}</h2>
      <div className="space-y-3 text-sm text-neutral-300">{children}</div>
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-[family-name:var(--font-mono)] text-xs text-neutral-300">
      {children}
    </pre>
  );
}
