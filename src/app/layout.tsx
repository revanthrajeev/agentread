import type { Metadata } from "next";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
import "./globals.css";

// Self-hosted Geist (SIL OFL) — matches the reference design's typeface without a Google Fonts
// network dependency. Variable fonts, so one file each covers the whole weight range.
const geist = localFont({
  src: "../../public/fonts/Geist-Variable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
});
const geistMono = localFont({
  src: "../../public/fonts/GeistMono-Variable.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "100 900",
});

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
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/logo-icon.png",
  },
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
        logo: `${base}/logo.png`,
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
    // Default to dark theme — matches the geoly.ai reference (black bg, grid pattern).
    // ThemeAccentToggle in the nav writes data-theme="light"/"dark" to this element on toggle.
    <html lang="en" data-theme="dark" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        {/* Restore persisted theme before first paint to avoid flash; defaults to dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ar-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');else document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(base)) }}
        />
        <Nav />
        {/* overflow-x: clip contains .reveal-l/.reveal-r, which park at translateX(±28px)
            until scrolled into view and otherwise push the page sideways. Clipping here
            rather than on <body> keeps the fixed nav unaffected, and `clip` (unlike `hidden`)
            creates no scroll container so sticky still works. */}
        <div className="flex-1" style={{ overflowX: "clip" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
