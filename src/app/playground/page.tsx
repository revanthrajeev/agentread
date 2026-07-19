"use client";

import { useState } from "react";
import CopyButton from "@/components/site/CopyButton";
import Gauge from "@/components/site/Gauge";

interface ReadResult {
  url: string;
  title: string;
  markdown: string;
  htmlSnippet: string;
  htmlBytes: number;
  markdownBytes: number;
  tokensBefore: number;
  tokensAfter: number;
  readScore: number;
  hallucinationRisk: "low" | "medium" | "high";
  flags: { severity: string; text: string }[];
  latencyMs: number;
  cache: "HIT" | "MISS";
}

const PRESETS = [
  { label: "🛍 E-commerce", url: "https://stripe.com/pricing" },
  { label: "📰 Article", url: "https://en.wikipedia.org/wiki/Artificial_intelligence" },
  { label: "📚 SaaS docs", url: "https://nextjs.org/docs" },
];

export default function PlaygroundPage() {
  const [url, setUrl] = useState(PRESETS[0].url);
  const [activePreset, setActivePreset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [error, setError] = useState("");

  async function run(targetUrl: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Read failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Read failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActivePreset(-1);
    run(url);
  }

  const savingsUsd = result ? ((result.tokensBefore - result.tokensAfter) / 1_000_000) * 3 : 0;

  return (
    <>
      <header className="pg-hero container">
        <span className="badge">
          <span className="dot" /> Live — real Read API, 10 reads/min per IP
        </span>
        <h1 className="hero-title" style={{ fontSize: "clamp(34px,4.6vw,54px)" }}>
          See what agents <span className="grad-text">actually see.</span>
        </h1>
        <p className="hero-sub">
          Pick a sample page (or paste any URL) and watch AgentRead turn browser soup into
          scored, agent-ready Markdown — for real, on every request.
        </p>

        <div className="preset-row">
          {PRESETS.map((p, i) => (
            <button
              key={p.url}
              type="button"
              className={`preset-btn ${activePreset === i ? "active" : ""}`}
              onClick={() => {
                setUrl(p.url);
                setActivePreset(i);
                run(p.url);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <form className="pg-url-row" onSubmit={onSubmit}>
          <input
            className="scan-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            spellCheck={false}
            aria-label="URL to read"
          />
          <button className="btn btn-primary magnetic" disabled={loading} type="submit">
            {loading ? "Reading…" : "Read & score"} <span className="arr">→</span>
          </button>
        </form>
        {error && (
          <p style={{ color: "var(--st-critical)", marginTop: 16, fontSize: 14 }}>{error}</p>
        )}
      </header>

      <main className="container" style={{ paddingBottom: 100 }}>
        {result && (
          <>
            <div className="split">
              <div className="pane glass pane-bad">
                <div className="pane-head">
                  <span>RAW HTML — what agents get without AgentRead</span>
                  <span className="kb">{(result.htmlBytes / 1024).toFixed(0)} KB</span>
                </div>
                <div className="pane-body">{result.htmlSnippet}…</div>
              </div>
              <div className="pane glass pane-good">
                <div className="pane-head">
                  <span>CLEAN MARKDOWN — with AgentRead</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <CopyButton text={result.markdown} style={{ position: "static" }} />
                    <span className="kb">{(result.markdownBytes / 1024).toFixed(1)} KB</span>
                  </span>
                </div>
                <div className="pane-body">{result.markdown}</div>
              </div>
            </div>

            <div className="scorecard">
              <Gauge score={result.readScore} />
              <div className="risk-card glass">
                <h3>
                  Hallucination risk flags{" "}
                  <span className="tag tag-live" style={{ marginLeft: 6 }}>
                    {result.flags.length}
                  </span>
                </h3>
                <div className="risk-list">
                  {result.flags.map((f, i) => (
                    <div className="risk-item" key={i}>
                      <span className={`sev sev-${f.severity}`}>{f.severity}</span>
                      <p>{f.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pg-kvs">
              <div className="stat-tile glass">
                <div className="stat-label">Payload</div>
                <div className="stat-value" style={{ fontSize: 24 }}>
                  {(result.htmlBytes / 1024).toFixed(0)}K → {(result.markdownBytes / 1024).toFixed(1)}K
                </div>
                <div className="stat-sub">
                  {(100 - (result.markdownBytes / result.htmlBytes) * 100).toFixed(1)}% reduction
                </div>
              </div>
              <div className="stat-tile glass">
                <div className="stat-label">Tokens per read</div>
                <div className="stat-value" style={{ fontSize: 24 }}>
                  {result.tokensAfter.toLocaleString()}
                </div>
                <div className="stat-sub">was {result.tokensBefore.toLocaleString()}</div>
              </div>
              <div className="stat-tile glass">
                <div className="stat-label">Input-token savings</div>
                <div className="stat-value" style={{ fontSize: 24 }}>
                  ${savingsUsd > 0 && savingsUsd < 0.01 ? "<0.01" : savingsUsd.toFixed(2)}
                </div>
                <div className="stat-sub">at $3 / M input tokens</div>
              </div>
              <div className="stat-tile glass">
                <div className="stat-label">Read latency</div>
                <div className="stat-value" style={{ fontSize: 24 }}>
                  {result.latencyMs} ms
                </div>
                <div className="stat-sub">{result.cache}</div>
              </div>
            </div>

            <p className="demo-note">
              Real request, real response — this is the exact output of{" "}
              <span className="mono">POST /api/read</span>.
            </p>
          </>
        )}
      </main>
    </>
  );
}
