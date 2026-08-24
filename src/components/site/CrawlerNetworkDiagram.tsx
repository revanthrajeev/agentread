import Reveal from "@/components/site/Reveal";

/**
 * Shows what Serve middleware actually does: known AI crawlers/agents on one side, routed
 * through AgentRead, clean Markdown out the other side. Real behavior, not decoration —
 * every label here is a real user-agent AgentRead's Serve layer recognizes (see
 * src/lib/serve/crawlers.ts), not a generic "AI" icon.
 */
const AGENTS = [
  { label: "GPTBot", sub: "OpenAI" },
  { label: "ClaudeBot", sub: "Anthropic" },
  { label: "PerplexityBot", sub: "Perplexity" },
  { label: "MCP client", sub: "Claude Code, Cursor…" },
];

export default function CrawlerNetworkDiagram() {
  return (
    <Reveal>
      <div className="network-diagram">
        <div className="network-agents">
          {AGENTS.map((a) => (
            <div key={a.label} className="network-node glass">
              <div className="network-node-label">{a.label}</div>
              <div className="network-node-sub">{a.sub}</div>
            </div>
          ))}
        </div>
        <div className="network-lines" aria-hidden="true" />
        <div className="network-hub glass">
          <span className="network-hub-dot" />
          agentread
        </div>
        <div className="network-lines network-lines-out" aria-hidden="true" />
        <div className="network-node glass network-output">
          <div className="network-node-label">Clean Markdown</div>
          <div className="network-node-sub">Scored, distilled, real</div>
        </div>
      </div>
    </Reveal>
  );
}
