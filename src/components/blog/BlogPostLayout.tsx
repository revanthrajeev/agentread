import Link from "next/link";
import type { ReactNode } from "react";
import { BLOG_POSTS } from "@/lib/blog/posts";

function articleJsonLd(slug: string, base: string) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: `${base}/blog/${slug}`,
    author: { "@type": "Organization", name: "AgentRead" },
    publisher: { "@type": "Organization", name: "AgentRead" },
    mainEntityOfPage: `${base}/blog/${slug}`,
  };
}

export default function BlogPostLayout({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://agentread.tech";
  const jsonLd = articleJsonLd(slug, base);

  return (
    <main className="container section">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <article style={{ maxWidth: 760, marginInline: "auto" }}>
        <Link href="/blog" style={{ fontSize: 13, color: "var(--muted)" }}>
          ← Blog
        </Link>

        {post && (
          <>
            <div className="eyebrow" style={{ marginTop: 20 }}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {" · "}
              {post.readMinutes} min read
            </div>
            <h1 className="title" style={{ marginTop: 8 }}>
              {post.title}
            </h1>
          </>
        )}

        <div className="prose" style={{ marginTop: 32 }}>
          {children}
        </div>

        <div
          className="glass"
          style={{
            marginTop: 48,
            padding: 28,
            borderRadius: "var(--r-lg)",
            textAlign: "center",
          }}
        >
          <h2 className="title" style={{ fontSize: 20 }}>
            See what your own site scores
          </h2>
          <p className="lead" style={{ marginTop: 8, marginInline: "auto" }}>
            A free scan takes about a minute and needs no account.
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/playground" className="btn btn-primary">
              Run a free scan
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
