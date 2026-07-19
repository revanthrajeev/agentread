import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import SiteCanvas from "@/components/site/SiteCanvas";
import PointerEffects from "@/components/site/PointerEffects";
import "./globals.css";

const inter = Inter({ variable: "--font-body", subsets: ["latin"] });
const sora = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
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
