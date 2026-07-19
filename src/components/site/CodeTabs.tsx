"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

export interface CodeTab {
  label: string;
  code: string;
  /** Marks a tab whose package/endpoint isn't published yet — shown but not copyable as if it works today. */
  roadmap?: boolean;
}

export default function CodeTabs({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const current = tabs[active];

  return (
    <div className="code-window">
      <div className="code-tabs">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            className={`code-tab ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            {t.label}
            {t.roadmap ? " (soon)" : ""}
          </button>
        ))}
      </div>
      <div className="code-pane active">
        {!current.roadmap && <CopyButton text={current.code} />}
        <pre>{current.code}</pre>
      </div>
    </div>
  );
}
