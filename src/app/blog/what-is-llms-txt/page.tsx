import type { Metadata } from "next";
import Link from "next/link";
import BlogPostLayout from "@/components/blog/BlogPostLayout";
import { BLOG_POSTS } from "@/lib/blog/posts";

const post = BLOG_POSTS.find((p) => p.slug === "what-is-llms-txt")!;

export const metadata: Metadata = {
  title: `${post.title} — AgentRead`,
  description: post.description,
  alternates: { canonical: "/blog/what-is-llms-txt" },
};

export default function Post() {
  return (
    <BlogPostLayout slug={post.slug}>
      <p>
        llms.txt is a plain-text file, served from the root of a domain
        (<code>/llms.txt</code>), that describes what a site is and links to the pages that
        matter most — in the same spirit as robots.txt or sitemap.xml, but written for an AI
        system to read rather than a crawler to obey.
      </p>

      <h2>What it actually contains</h2>
      <p>
        A minimal llms.txt is a short Markdown document: a one-line description of the site, a
        few sections grouping links by purpose (documentation, pricing, key product pages), and
        nothing else. Some sites also publish an <code>llms-full.txt</code> — the same idea
        expanded into full page content rather than just links, meant to be pasted directly into a
        model&apos;s context window.
      </p>

      <h2>What it is not</h2>
      <p>
        It is not a ratified standard. No AI vendor has committed, contractually or otherwise, to
        reading it, and there&apos;s no enforcement mechanism the way there is for robots.txt
        (which crawlers are expected to respect by convention, if not by law). It will not fix a
        page that&apos;s broken for crawlers in the first place — a llms.txt pointing at a page
        whose price only renders after JavaScript runs doesn&apos;t make that price readable.
      </p>

      <h2>Does anything actually read it?</h2>
      <p>
        ChatGPT, Claude and Perplexity have all been observed fetching llms.txt when it exists,
        though none of them publish a guarantee about how the content is weighted once fetched.
        The honest way to think about it: it costs a few hundred bytes and a few minutes to write,
        it cannot hurt, and on the sites where it&apos;s been tested it has measurably changed how
        a model describes what the site offers — mostly because it gives a model a concise, curated
        summary instead of forcing it to infer one from a homepage&apos;s marketing copy.
      </p>

      <h2>A llms.txt worth having</h2>
      <p>The ones that help share three traits:</p>
      <ul>
        <li>
          <strong>Accurate.</strong> Generated from a real crawl of the site, not written by hand
          once and left to drift as pages change.
        </li>
        <li>
          <strong>Prioritised.</strong> Links to the handful of pages that actually explain the
          product — not every URL on the site, which defeats the point of a curated summary.
        </li>
        <li>
          <strong>Kept in sync.</strong> Regenerated when the site changes, the same way a sitemap
          should be.
        </li>
      </ul>
      <p>
        AgentRead&apos;s{" "}
        <Link href="/tools/llms-txt-generator">free llms.txt generator</Link> does this from an
        actual crawl of your site rather than a template, and every AgentRead audit checks whether
        the file exists and whether it&apos;s stale against the pages it links to.
      </p>

      <h2>Where it fits</h2>
      <p>
        llms.txt is one input among several, not a strategy on its own. It sits alongside making
        sure your actual pages render their content server-side and allowing the AI crawlers
        relevant to your business in robots.txt — see{" "}
        <Link href="/blog/how-to-get-indexed-by-chatgpt">
          how to get your site read by ChatGPT, Claude and Perplexity
        </Link>{" "}
        for the fuller picture.
      </p>
    </BlogPostLayout>
  );
}
