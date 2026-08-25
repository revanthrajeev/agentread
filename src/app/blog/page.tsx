import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog — AgentRead",
  description:
    "Notes on AI search visibility: how AI crawlers read (or fail to read) websites, llms.txt, GEO vs SEO, and what actually changes what ChatGPT, Claude and Perplexity say about your site.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="container section">
      <div className="section-head" style={{ maxWidth: 760, marginInline: "auto" }}>
        <div className="eyebrow">Blog</div>
        <h1 className="title">Notes on AI search visibility</h1>
        <p className="lead">
          How AI crawlers actually read websites, what llms.txt does and doesn&apos;t do, and the
          difference between optimising for a ranked list of links and optimising for a direct
          answer.
        </p>
      </div>

      <div style={{ maxWidth: 760, marginInline: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="glass glass-hover"
            style={{ display: "block", padding: "24px 26px", borderRadius: "var(--r-lg)" }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {post.readMinutes} min read
            </div>
            <h2 className="title" style={{ fontSize: 21 }}>
              {post.title}
            </h2>
            <p className="lead" style={{ marginTop: 8, fontSize: 15 }}>
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
