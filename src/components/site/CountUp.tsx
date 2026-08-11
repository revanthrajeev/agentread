"use client";

import { useEffect, useRef, useState } from "react";

/** Pinned to en-US so the server and client render byte-identical text and hydration matches. */
function format(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

/**
 * Animates up to a real value when scrolled into view. Never fabricates a number — value must
 * come from the caller.
 *
 * The resting state is the *real* value, not zero. An earlier version started at 0 and only
 * ever reached the true number if an IntersectionObserver fired, which meant the figure was
 * rendered as "0" server-side and stayed "0" whenever the observer never ran — an element
 * taller than the viewport never reaches a 0.5 threshold, and no-JS clients and crawlers never
 * run the effect at all. On this site that mattered twice over: the landing page was showing
 * "0× less payload", and the crawlers it exists to serve were reading a zero.
 *
 * So: render the truth first, then animate from zero only once we know the animation will run.
 */
export default function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  fallback,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  /** Used when `value` is missing or not finite, so the UI never advertises a broken 0. */
  fallback?: number;
}) {
  const resolved = Number.isFinite(value) ? value : (fallback ?? 0);

  const [node, setNode] = useState<HTMLSpanElement | null>(null);
  // Starts at the real number: correct before hydration, and correct forever if the observer
  // never fires.
  const [display, setDisplay] = useState(() => format(resolved, decimals));
  const started = useRef(false);

  useEffect(() => {
    if (!node) return;

    // Without IntersectionObserver there is no scroll trigger — leave the real value showing.
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.unobserve(node);

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced || resolved === 0) {
          setDisplay(format(resolved, decimals));
          return;
        }

        const dur = 1400;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(format(resolved * eased, decimals));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      // Tall type can never be 50% visible on a short viewport, which is one of the ways the
      // old version got stuck on 0. A small threshold fires for any element size.
      { threshold: 0.01 }
    );

    io.observe(node);
    return () => io.disconnect();
  }, [node, resolved, decimals]);

  return (
    <span ref={setNode}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
