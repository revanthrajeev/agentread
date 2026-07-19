"use client";

import { useEffect, useRef } from "react";

const ARC_LENGTH = 279.6;

export default function Gauge({ score }: { score: number }) {
  const pathRef = useRef<SVGPathElement>(null);

  // Imperative DOM mutation via ref, not React state — the CSS transition animates from
  // whatever value is currently on the element, so re-scoring smoothly morphs old → new
  // instead of resetting to empty each time.
  useEffect(() => {
    const target = ARC_LENGTH * (1 - Math.max(0, Math.min(100, score)) / 100);
    pathRef.current?.style.setProperty("stroke-dashoffset", String(target));
  }, [score]);

  const tier = score >= 75 ? "good" : score >= 55 ? "warn" : "serious";
  const strokeVar = `var(--st-${tier})`;
  const statusLabel = tier === "good" ? "✓ agent-ready" : tier === "warn" ? "◮ needs work" : "▲ at risk";

  return (
    <div className="gauge-card glass">
      <div className="stat-label" style={{ fontSize: 13 }}>
        ReadScore
      </div>
      <div className="gauge-wrap">
        <svg viewBox="0 0 210 118" className="chart-svg" aria-hidden="true">
          <path
            d="M 16 105 A 89 89 0 0 1 194 105"
            fill="none"
            stroke="var(--viz-track)"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            ref={pathRef}
            d="M 16 105 A 89 89 0 0 1 194 105"
            fill="none"
            stroke={strokeVar}
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={ARC_LENGTH}
            style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.22,1,.36,1), stroke .4s" }}
          />
        </svg>
        <div className="gauge-num">
          {score}
          <span className="of">out of 100</span>
        </div>
      </div>
      <div className={`gauge-status s-${tier}`}>{statusLabel}</div>
    </div>
  );
}
