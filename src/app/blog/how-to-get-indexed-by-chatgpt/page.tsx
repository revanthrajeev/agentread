import type { Metadata } from "next";
import Link from "next/link";
import BlogPostLayout from "@/components/blog/BlogPostLayout";
import { BLOG_POSTS } from "@/lib/blog/posts";

const post = BLOG_POSTS.find((p) => p.slug === "how-to-get-indexed-by-chatgpt")!;

export const metadata: Metadata = {
  title: `${post.title} — AgentRead`,
  description: post.description,
  alternates: { canonical: "/blog/how-to-get-indexed-by-chatgpt" },
};

export default function Post() {
  return (
    <BlogPostLayout slug={post.slug}>
      <p>
        &ldquo;Getting indexed by ChatGPT&rdquo; is a slightly misleading phrase, because ChatGPT
        doesn&apos;t index the web the way Google does. There&apos;s no single crawl feeding a
        ranked index that OpenAI serves answers from. Instead there are several separate paths a
        page can reach a model through, and most sites fail all of them without realising it.
      </p>

      <h2>The three ways an AI system sees your page</h2>
      <p>
        First, training data: crawlers like GPTBot, ClaudeBot and CCBot fetch pages ahead of time
        and the content becomes part of what a model has learned, showing up in answers with no
        live lookup involved. Second, live browsing: when ChatGPT, Claude or Perplexity search
        the web in response to a question, an agent (ChatGPT-User, PerplexityBot and similar)
        fetches your page in real time and reads whatever comes back. Third, retrieval systems
        like Perplexity&apos;s index or Google&apos;s AI Overviews sit closer to a traditional
        search index but still depend on the same underlying fetch.
      </p>
      <p>
        All three paths share one weakness: none of them execute JavaScript the way a browser
        does. GPTBot and ClaudeBot fetch raw HTML and stop there. If your price, your product
        description or your main call to action only exists after a script runs, these crawlers
        receive a page with none of it — even though a human visiting the same URL sees it fine.
      </p>

      <h2>Check what a crawler actually receives</h2>
      <p>The fastest way to see the gap between what you built and what an AI crawler gets:</p>
      <ol>
        <li>
          Fetch your own page with a bare HTTP client and no JavaScript, the way GPTBot does —{" "}
          <code>curl https://yoursite.com</code> is close enough for a first look.
        </li>
        <li>
          Search the response for your price, your headline claim and your primary call to
          action. If they&apos;re missing from the raw HTML, they&apos;re missing from what the
          crawler reads.
        </li>
        <li>
          Check whether your call-to-action button is disabled or hidden until a script runs —
          crawlers see the disabled state, not the state a click would produce.
        </li>
      </ol>
      <p>
        This is exactly what a{" "}
        <Link href="/playground">free AgentRead scan</Link> automates: it fetches a URL the same
        way an AI crawler does, diffs it against what a browser renders, and returns a 0–100
        ReadScore with the specific lines of markup causing the gap.
      </p>

      <h2>The fixes that move the number most</h2>
      <ul>
        <li>
          <strong>Server-render or statically generate anything you want quoted.</strong> Price,
          product name, key specs and your main CTA should exist in the HTML response itself, not
          only after hydration.
        </li>
        <li>
          <strong>Don&apos;t block the crawlers you want to reach you.</strong> A default-deny
          robots.txt, or one written before AI crawlers existed, silently excludes GPTBot,
          ClaudeBot and PerplexityBot. Explicitly allow the ones relevant to your business.
        </li>
        <li>
          <strong>Publish an llms.txt.</strong> It won&apos;t fix a broken page, but it tells AI
          systems what your site is for and which pages matter most — see{" "}
          <Link href="/blog/what-is-llms-txt">what llms.txt actually does</Link>.
        </li>
        <li>
          <strong>Keep your sitemap accurate and your headings structured.</strong> A single clear
          H1 per page and a sitemap that reflects real, current URLs is how both Googlebot and AI
          crawlers discover what to fetch in the first place.
        </li>
      </ul>

      <h2>What this doesn&apos;t fix</h2>
      <p>
        None of this guarantees a model mentions you by name in an answer — that depends on
        relevance, competition and how the question is asked, which is a different problem from
        whether the crawler can read your page at all. But a page a crawler can&apos;t parse has a
        ReadScore near zero regardless of how good the product is, so this is the floor everything
        else stands on.
      </p>
    </BlogPostLayout>
  );
}
