export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readMinutes: number;
}

/**
 * One entry per post, used by the index page and the sitemap. The date is the source of
 * truth for both the visible "Updated" label and the sitemap's lastModified — bump it when a
 * post's content actually changes, not on every deploy, or the freshness signal becomes noise.
 */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-get-indexed-by-chatgpt",
    title: "How to Get Your Site Read by ChatGPT, Claude and Perplexity",
    description:
      "Why most sites are invisible to AI crawlers, how to check what GPTBot and ClaudeBot actually receive, and the fixes that make the biggest difference.",
    date: "2026-08-25",
    readMinutes: 7,
  },
  {
    slug: "what-is-llms-txt",
    title: "What Is llms.txt, and Do You Actually Need One?",
    description:
      "A plain-English explanation of the llms.txt convention: what it does, what it doesn't, which AI systems read it, and how to write one that's worth having.",
    date: "2026-08-25",
    readMinutes: 5,
  },
  {
    slug: "geo-vs-seo-checklist",
    title: "GEO vs SEO: A Practical Checklist for Both",
    description:
      "Generative Engine Optimization isn't a replacement for SEO — it's a second, different rendering path your site has to survive. Here's what changes and what doesn't.",
    date: "2026-08-25",
    readMinutes: 6,
  },
];
