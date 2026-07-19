/**
 * Known AI-agent/crawler User-Agent substrings, as published by each vendor. This list is a
 * living document, not a permanent guarantee — vendors add/rename bots over time, so treat
 * this as "the well-established set as of this commit," and check each vendor's bot-docs page
 * before relying on it for anything security-sensitive (it is not a verification mechanism —
 * a User-Agent header is client-supplied and trivially spoofable; this is for serving a better
 * response to good-faith crawlers, not for access control).
 */
export const KNOWN_AI_CRAWLERS: Record<string, string> = {
  GPTBot: "OpenAI (training crawler)",
  "ChatGPT-User": "OpenAI (live browsing)",
  "OAI-SearchBot": "OpenAI (search)",
  ClaudeBot: "Anthropic (training crawler)",
  "Claude-User": "Anthropic (live browsing)",
  "Claude-SearchBot": "Anthropic (search)",
  PerplexityBot: "Perplexity (training crawler)",
  "Perplexity-User": "Perplexity (live browsing)",
  CCBot: "Common Crawl",
  Bytespider: "ByteDance",
  "Applebot-Extended": "Apple (AI training)",
  Amazonbot: "Amazon",
};

/** Returns the matched crawler's display name, or null if the UA doesn't match a known AI crawler. */
export function detectCrawler(userAgent: string | null): string | null {
  if (!userAgent) return null;
  for (const [token, name] of Object.entries(KNOWN_AI_CRAWLERS)) {
    if (userAgent.includes(token)) return name;
  }
  return null;
}
