import type { ReadFlag } from "./read";

export interface ProtocolResult {
  protocolScore: number;
  protocolFlags: ReadFlag[];
}

/**
 * Agent-protocol manifest checks — the frontier of "agent readability" beyond content
 * extraction: can an agent discover this site's MCP server, A2A agent card, or payment
 * capability (x402) at all. Cloudflare's isitagentready.com and agent-ready.dev both check
 * this layer; AgentRead's scoring didn't, which was the single biggest gap the competitive
 * research turned up. Deterministic HEAD checks against well-known paths — no LLM cost,
 * same pattern as the llms.txt check already in read.ts.
 *
 * Unlike readScore/seoScore, a 0 here is normal and not penalized hard — most sites
 * legitimately have no MCP server or A2A agent to advertise. This measures "if you have
 * one, can an agent find it," not "every site must have one."
 */

const WELL_KNOWN_CHECKS: Array<{ path: string; label: string }> = [
  { path: "/.well-known/mcp-server-card.json", label: "MCP Server Card" },
  { path: "/.well-known/ai-plugin.json", label: "AI plugin manifest" },
  { path: "/agents.json", label: "A2A agent manifest (agents.json)" },
  { path: "/.well-known/agent-card.json", label: "A2A agent card" },
];

async function exists(base: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(new URL(path, base).toString(), {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function computeProtocolScore(baseUrl: string): Promise<ProtocolResult> {
  const flags: ReadFlag[] = [];
  const found = await Promise.all(WELL_KNOWN_CHECKS.map((c) => exists(baseUrl, c.path)));

  let anyFound = false;
  found.forEach((ok, i) => {
    if (ok) {
      anyFound = true;
      flags.push({ severity: "ok", text: `${WELL_KNOWN_CHECKS[i].label} found at ${WELL_KNOWN_CHECKS[i].path}.` });
    }
  });

  if (!anyFound) {
    flags.push({
      severity: "low",
      text: "No agent-protocol manifests found (MCP Server Card, A2A agent card, agents.json) — fine if this site doesn't expose an agent/tool surface, worth adding if it does.",
    });
  }

  // Not punitive by default — see the module comment. Score reflects "how discoverable is
  // whatever you DO expose," scaled by how many of the checked manifest types are present.
  const foundCount = found.filter(Boolean).length;
  const protocolScore = foundCount === 0 ? 60 : Math.min(100, 60 + foundCount * 15);

  return { protocolScore, protocolFlags: flags };
}
