import type { Metadata } from "next";
import Link from "next/link";
import LlmsTxtGeneratorForm from "@/components/tools/LlmsTxtGeneratorForm";

export const metadata: Metadata = {
  title: "Free llms.txt Generator — AgentRead",
  description:
    "Paste a URL, get a real llms.txt and llms-full.txt generated from your actual pages — no signup, no fake placeholder content.",
  alternates: { canonical: "/tools/llms-txt-generator" },
};

export default function LlmsTxtGeneratorPage() {
  return (
    <main className="container section">
      <div className="section-head">
        <div className="eyebrow">Free tool — no signup</div>
        <h1 className="title">llms.txt Generator</h1>
        <p className="lead">
          Paste your site&rsquo;s URL. This crawls up to 8 real pages and generates a real{" "}
          <code>llms.txt</code> and <code>llms-full.txt</code> from what it actually finds — nothing
          templated or invented. Need more than 8 pages?{" "}
          <Link href="/login">Sign up free</Link> for up to 200 per crawl via the API.
        </p>
      </div>

      <LlmsTxtGeneratorForm />

      <section className="section-tight" style={{ marginTop: 40 }}>
        <h2 className="title" style={{ fontSize: 22 }}>
          What is llms.txt?
        </h2>
        <p className="lead">
          A machine-readable index of your site, at <code>/llms.txt</code>, that AI agents check
          before crawling — the same job <code>robots.txt</code> does for search engines, but
          written for language models. Without one, an agent has no sanctioned map of your site and
          falls back to guessing.
        </p>
      </section>
    </main>
  );
}
