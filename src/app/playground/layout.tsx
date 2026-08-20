import type { Metadata } from "next";

/**
 * The playground page is a Client Component, and a Client Component cannot export `metadata`.
 * Next's supported route for that is a colocated layout, which is all this file is — without
 * it the page inherited the root layout's title and shipped a duplicate <title>.
 */
export const metadata: Metadata = {
  title: "Playground — AgentRead",
  description:
    "Paste any URL and watch AgentRead turn it into scored, agent-ready Markdown — live ReadScore, hallucination-risk flags, and every deduction named. No account needed.",
  alternates: { canonical: "/playground" },
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
