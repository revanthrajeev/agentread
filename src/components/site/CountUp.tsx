"use client";

import { useEffect, useRef, useState } from "react";

/** Animates up to a real value when scrolled into view. Never fabricates a number — value must come from the caller. */
export default function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [node, setNode] = useState<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(() => (0).toFixed(decimals));
  const started = useRef(false);

  useEffect(() => {
    if (!node) return;
    const fmt = (n: number) =>
      n.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.unobserve(node);

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced || value === 0) {
          setDisplay(fmt(value));
          return;
        }
        const dur = 1400;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(fmt(value * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, value, decimals]);

  return (
    <span ref={setNode}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
