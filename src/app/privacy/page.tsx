export const metadata = { title: "Privacy Policy — AgentRead" };

export default function PrivacyPage() {
  return (
    <main className="container" style={{ maxWidth: 720, paddingBlock: 64 }}>
      <h1 className="title" style={{ fontSize: 32 }}>
        Privacy Policy
      </h1>
      <p className="lead" style={{ marginTop: 8 }}>Last updated July 19, 2026.</p>

      <div style={{ marginTop: 32, display: "grid", gap: 24, lineHeight: 1.7, fontSize: 15 }}>
        <p>
          AgentRead (&quot;we,&quot; &quot;us&quot;) is a tool that fetches and distills web pages for AI agents. This
          page describes, plainly, what data we collect and why. We are an early-stage product —
          if anything here is unclear, email us and we&apos;ll clarify or fix it.
        </p>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>What we collect</h2>
          <ul style={{ paddingLeft: 20, display: "grid", gap: 8 }}>
            <li>
              <strong>Account info.</strong> If you sign in with Google or an email magic link, we
              store your email address and (for Google) the name/avatar Google provides. Sign-in
              itself is handled by Supabase Auth — we never see or store your Google password.
            </li>
            <li>
              <strong>Read history.</strong> URLs you submit through the Read API, Playground, or
              MCP server, along with the resulting ReadScore, flags, and byte/token counts. If
              you&apos;re signed in, this is tied to your account so your dashboard can show it to
              you; if you use the anonymous public ReadScan tool, it is not tied to an account.
            </li>
            <li>
              <strong>API keys.</strong> We store a one-way hash of any API key you generate, never
              the plaintext (which is shown to you once, at creation, and never again).
            </li>
            <li>
              <strong>Waitlist emails.</strong> If you join the waitlist, we store the email address
              you provide.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>What we don&apos;t do</h2>
          <p>
            We don&apos;t run third-party analytics, ad trackers, or session-replay scripts on this
            site as of this writing. We don&apos;t sell your data. We don&apos;t use the content of
            URLs you scan for anything other than returning you the result and (if you&apos;re
            signed in) showing it back to you in your own dashboard.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Where data lives</h2>
          <p>
            Account and application data is stored in Supabase (PostgreSQL), protected by
            row-level security so your data is only ever readable by you and by our service for
            operating the product. The underlying extraction engine makes a real HTTP request to
            whatever URL you submit — that request is visible to the target site&apos;s own server
            logs, the same as any other web request.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Your choices</h2>
          <p>
            You can revoke any API key at any time from your dashboard. You can delete your
            account and associated data by emailing us — we don&apos;t yet have a self-serve
            delete-account button, and we&apos;re telling you that plainly rather than pretending
            otherwise.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Contact</h2>
          <p>
            Questions about this policy or your data: reach out via the contact details on our
            GitHub repository.
          </p>
        </section>
      </div>
    </main>
  );
}
