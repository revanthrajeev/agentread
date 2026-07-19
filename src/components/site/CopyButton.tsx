"use client";

import { useState } from "react";

export default function CopyButton({
  text,
  className = "copy-btn",
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // clipboard permission denied — silently ignore, button just won't confirm
        }
      }}
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}
