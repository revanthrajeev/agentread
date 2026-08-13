import OpenAI from "openai";
import { costUsd } from "@/lib/fix/pricing";

/**
 * Citation-readiness spot-check — deliberately NOT live AI-citation monitoring.
 *
 * The competitive research found a whole funded category (Profound $155M, Semrush AI
 * Visibility, Otterly.ai) built around polling ChatGPT/Perplexity/Gemini's actual answers
 * to track real citations over time. That's expensive (repeated API calls per tracked
 * query, ongoing), saturated, and off-thesis for a fix-the-site product — building it for
 * real would mean becoming a GEO monitoring company, not an agent-readability one.
 *
 * What's genuinely useful and cheap: asking a model to judge, from the page's own
 * extracted content, whether it reads like something worth citing for a given topic — the
 * same kind of signal a human editor would give in one read. One inference call, no
 * ongoing cost, no claim of tracking real ChatGPT/Perplexity behavior. Labelled as such
 * everywhere this result is shown.
 */

export interface CitationCheckResult {
  wouldCite: boolean;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  costUsd: number;
}

const SYSTEM_PROMPT = `You judge whether a web page is the kind of source an AI assistant would cite or summarize when answering a user's question on a given topic.

Judge only from the page content given to you — clarity, specificity, whether it actually answers likely questions on the topic, whether claims look substantiated. Do not judge SEO or design.

Return strict JSON: {"would_cite": boolean, "confidence": "low"|"medium"|"high", "reasoning": "one or two sentences, addressed to the site owner"}.`;

let cached: OpenAI | null = null;
function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");
  if (!cached) cached = new OpenAI();
  return cached;
}

export function isCitationCheckConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function checkCitationReadiness(markdown: string, topic: string): Promise<CitationCheckResult> {
  const client = getClient();
  const model = "gpt-5-nano" as const;

  const response = await client.chat.completions.create({
    model,
    max_tokens: 400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Topic a user might ask about: "${topic}"\n\nPage content:\n${markdown.slice(0, 12_000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "citation_judgment",
        strict: true,
        schema: {
          type: "object",
          properties: {
            would_cite: { type: "boolean" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            reasoning: { type: "string" },
          },
          required: ["would_cite", "confidence", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Citation check returned no content.");
  const parsed = JSON.parse(raw) as { would_cite: boolean; confidence: "low" | "medium" | "high"; reasoning: string };

  const usage = response.usage;
  const cost = usage
    ? costUsd(
        { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 },
        model
      )
    : 0;

  return { wouldCite: parsed.would_cite, confidence: parsed.confidence, reasoning: parsed.reasoning, costUsd: cost };
}
