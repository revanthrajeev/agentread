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
  title: "AgentRead — Make your website readable to AI agents",
  description:
    "AgentRead serves every AI agent clean, scored Markdown — same content, 100x fewer tokens, one line of middleware.",
  openGraph: {
    title: "AgentRead — Make your website readable to AI agents",
    description: "Clean, scored Markdown for AI agents. One line of middleware. 100x fewer tokens.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
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
