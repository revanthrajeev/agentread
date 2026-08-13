import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://agentread.tech";
  const routes = [
    "",
    "/pricing",
    "/docs",
    "/playground",
    "/tools/llms-txt-generator",
    "/login",
    "/privacy",
    "/terms",
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/pricing" || route.startsWith("/tools/") ? 0.8 : 0.6,
  }));
}
