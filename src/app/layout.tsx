import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import SiteCanvas from "@/components/site/SiteCanvas";
import PointerEffects from "@/components/site/PointerEffects";
import "./globals.css";

const inter = Inter({ variable: "--font-body", subsets: ["latin"] });
const sora = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

/**
 * `NEXT_PUBLIC_SITE_URL` was never set on Netlify, so metadataBase silently fell back to
 * localhost — every shared link's og:image/twitter:image pointed at localhost:3000 in
 * production. Netlify (and Vercel) both auto-inject their own env vars with the site's real
 * URL at build time, so use those as a self-healing fallback instead of trusting one
 * manually-set var — an explicit NEXT_PUBLIC_SITE_URL still always wins if set.
 */
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.URL) return process.env.URL; // Netlify: primary site URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: "AgentRead — AI search visibility you can actually fix",
  description:
    "See what ChatGPT, Claude and Perplexity actually read on your site, find out why you're missing from AI answers, and ship the fix as a pull request.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AgentRead — AI search visibility you can actually fix",
    description:
      "Other tools tell you you're invisible in AI answers. AgentRead tells you why, in the markup, and ships the fix.",
    images: ["/og.png"],
  },
};

/**
 * Organization + SoftwareApplication JSON-LD — schema.org types, not invented. Verified
 * shape (both are standard, widely-documented schema.org types, unlike the unverified
 * "MCP Server Card" convention deliberately left unpublished until it's actually checked
 * against a real spec — see the note in .well-known/ai-catalog.json/route.ts).
 */
function structuredData(base: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}#org`,
        name: "AgentRead",
        url: base,
        logo: `${base}/favicon.ico`,
      },
      {
        "@type": "SoftwareApplication",
        name: "AgentRead",
        url: base,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "AI search visibility platform: audits what AI crawlers can actually read on your site, scores every page, and ships the fix as a pull request.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@id": `${base}#org` },
      },
    ],
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const base = resolveSiteUrl();
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(base)) }}
        />
        <div className="backdrop">
          <div className="grid-bg" />
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="noise" />
        </div>
        <SiteCanvas />
        <PointerEffects />
        <Nav />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
