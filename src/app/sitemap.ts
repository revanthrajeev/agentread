import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";

/**
 * Per-route lastModified, not a single `new Date()` for every URL — stamping every page with
 * today's date on every build looks auto-generated (because it is) and gives crawlers no real
 * freshness signal. Bump a route's date here only when its content actually changes.
 */
const ROUTE_DATES: Record<string, string> = {
  "": "2026-08-25",
  "/pricing": "2026-08-25",
  "/faq": "2026-08-25",
  "/docs": "2026-08-08",
  "/playground": "2026-08-08",
  "/blog": "2026-08-25",
  "/tools/llms-txt-generator": "2026-08-08",
  "/compare/ai-visibility-tools": "2026-08-08",
  "/login": "2026-08-06",
  "/privacy": "2026-08-06",
  "/terms": "2026-08-06",
};

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://agentread.tech";
  const routes = Object.keys(ROUTE_DATES);
  const blogRoutes = BLOG_POSTS.map((p) => `/blog/${p.slug}`);

  const staticEntries = routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(ROUTE_DATES[route]),
    changeFrequency: (route === "" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority:
      route === "" ? 1
      : route === "/pricing" || route === "/faq" || route === "/blog" || route.startsWith("/tools/") || route.startsWith("/compare/") ? 0.8
      : 0.6,
  }));

  const blogEntries = blogRoutes.map((route) => {
    const post = BLOG_POSTS.find((p) => `/blog/${p.slug}` === route)!;
    return {
      url: `${base}${route}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });

  return [...staticEntries, ...blogEntries];
}
