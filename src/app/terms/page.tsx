export const metadata = { title: "Terms of Use — AgentRead" };

export default function TermsPage() {
  return (
    <main className="container" style={{ maxWidth: 720, paddingBlock: 64 }}>
      <h1 className="title" style={{ fontSize: 32 }}>
        Terms of Use
      </h1>
      <p className="lead" style={{ marginTop: 8 }}>Last updated July 19, 2026.</p>

      <div style={{ marginTop: 32, display: "grid", gap: 24, lineHeight: 1.7, fontSize: 15 }}>
        <p>
          AgentRead is an early-stage product. By using it you agree to the following, written in
          plain language on purpose.
        </p>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>What the service does</h2>
          <p>
            AgentRead fetches a URL you provide, extracts its readable content, and returns clean
            Markdown plus a ReadScore. You&apos;re responsible for only submitting URLs you have
            the right to fetch and process — don&apos;t use this to bypass a paywall, access-control
            system, or robots.txt disallow rule you don&apos;t have permission to bypass.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No warranty</h2>
          <p>
            The ReadScore and flags are a heuristic, not a guarantee — they&apos;re meant to help
            you find real issues, not to certify that a page is or isn&apos;t safe for an AI agent
            to rely on. The service is provided &quot;as is,&quot; without warranty of any kind. We are not
            liable for decisions made based on its output.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Fair use / rate limits</h2>
          <p>
            The anonymous Playground and ReadScan tools are rate-limited per IP; the authenticated
            Read API and MCP server are rate-limited per API key. We reserve the right to throttle,
            suspend, or revoke access that abuses these limits or that we reasonably believe is
            being used to scrape content at scale in a way that harms target sites.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Accounts</h2>
          <p>
            You&apos;re responsible for keeping your API keys confidential. If a key is compromised,
            revoke it from your dashboard immediately — we do not monitor for key misuse in real
            time today.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Changes</h2>
          <p>
            This is a young, fast-moving product — these terms, and the product itself, may change.
            We&apos;ll update the date at the top of this page when they do.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Contact</h2>
          <p>Questions: reach out via the contact details on our GitHub repository.</p>
        </section>
      </div>
    </main>
  );
}
