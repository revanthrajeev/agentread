import type { Metadata } from "next";
import Link from "next/link";
import BlogPostLayout from "@/components/blog/BlogPostLayout";
import { BLOG_POSTS } from "@/lib/blog/posts";

const post = BLOG_POSTS.find((p) => p.slug === "geo-vs-seo-checklist")!;

export const metadata: Metadata = {
  title: `${post.title} — AgentRead`,
  description: post.description,
  alternates: { canonical: "/blog/geo-vs-seo-checklist" },
};

export default function Post() {
  return (
    <BlogPostLayout slug={post.slug}>
      <p>
        Generative Engine Optimization (GEO) gets described as the successor to SEO, which
        overstates it. Google isn&apos;t going anywhere, and most of what makes a page rank well
        still applies. What&apos;s actually true is narrower: your site now has a second audience
        — an assistant reading one page and producing a direct answer, with no list of links in
        between — and that audience has different failure modes than a search-ranking algorithm
        does.
      </p>

      <h2>What stays the same</h2>
      <ul>
        <li>Fast, accessible pages still matter — to Googlebot, to users, and to any crawler.</li>
        <li>Clean semantic HTML (one H1, real heading hierarchy, meaningful alt text) helps both.</li>
        <li>Structured data (schema.org JSON-LD) is read by search engines and increasingly by AI systems for the same reason: it&apos;s the unambiguous version of what the page says.</li>
        <li>Backlinks and mentions from real, relevant sites still signal authority — to search engines directly, and to AI systems indirectly, since many are trained on or retrieve from the same web.</li>
      </ul>

      <h2>What&apos;s different</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
            <th style={{ padding: "8px 12px 8px 0" }}>Traditional SEO</th>
            <th style={{ padding: "8px 0" }}>GEO</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 12px 8px 0" }}>Optimises for rank position in a list of links</td>
            <td style={{ padding: "8px 0" }}>Optimises for being the source of a single direct answer</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 12px 8px 0" }}>Keyword targeting and search volume drive content decisions</td>
            <td style={{ padding: "8px 0" }}>Being quotable and self-contained drives content decisions</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 12px 8px 0" }}>A visitor lands on your page and reads the whole thing</td>
            <td style={{ padding: "8px 0" }}>An assistant lifts one paragraph with no surrounding context</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "8px 12px 8px 0" }}>Rendering can happen client-side; Googlebot executes JS</td>
            <td style={{ padding: "8px 0" }}>Most AI crawlers (GPTBot, ClaudeBot) fetch raw HTML only</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px 8px 0" }}>Sitemap.xml is the map crawlers follow</td>
            <td style={{ padding: "8px 0" }}>llms.txt increasingly supplements it for AI systems</td>
          </tr>
        </tbody>
      </table>

      <h2>A practical checklist</h2>
      <p><strong>Technical (do these regardless of audience):</strong></p>
      <ul>
        <li>Server-render or statically generate price, product name and primary CTA</li>
        <li>One clear H1 per page, real heading hierarchy underneath</li>
        <li>Accurate, current sitemap.xml with real lastmod dates</li>
        <li>robots.txt explicitly allows the crawlers relevant to your business</li>
      </ul>
      <p><strong>GEO-specific:</strong></p>
      <ul>
        <li>Publish an llms.txt — see <Link href="/blog/what-is-llms-txt">what it does and doesn&apos;t do</Link></li>
        <li>Write key paragraphs so they&apos;re quotable standalone: state the subject, don&apos;t rely on surrounding context</li>
        <li>Add FAQPage, Article and Organization JSON-LD where genuinely accurate — never data that disagrees with the visible page</li>
        <li>Check what GPTBot and ClaudeBot actually receive, not just what a browser renders</li>
      </ul>
      <p><strong>Content and authority (helps both):</strong></p>
      <ul>
        <li>Get mentioned on Reddit, Hacker News and community sites AI systems retrieve from and are trained on</li>
        <li>Build comparison and how-to content that answers real questions directly, not thin pages built for keyword volume alone</li>
      </ul>

      <p>
        The overlap is large enough that fixing one usually helps the other. The gap is real
        enough that a page which ranks fine on Google can still score near zero on what an AI
        crawler receives — see{" "}
        <Link href="/blog/how-to-get-indexed-by-chatgpt">
          how to check what your site looks like to ChatGPT, Claude and Perplexity
        </Link>
        .
      </p>
    </BlogPostLayout>
  );
}
