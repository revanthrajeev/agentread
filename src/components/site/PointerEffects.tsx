"use client";

import { useEffect } from "react";

/**
 * Global, delegated pointer effects for `.tilt` / `.card-glow` / `.magnetic` elements — mounted
 * once in the root layout. Delegation (rather than binding listeners per-element) means it keeps
 * working across client-side navigations without needing to requery the DOM on every route change.
 * No-ops for touch devices and prefers-reduced-motion.
 */
export default function PointerEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    function onMove(e: PointerEvent) {
      const target = e.target as HTMLElement;

      const tilt = target.closest<HTMLElement>(".tilt");
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `perspective(900px) rotateY(${px * 5}deg) rotateX(${py * -5}deg) translateY(-3px)`;
      }

      const glow = target.closest<HTMLElement>(".card-glow");
      if (glow) {
        const r = glow.getBoundingClientRect();
        glow.style.setProperty("--mx", `${e.clientX - r.left}px`);
        glow.style.setProperty("--my", `${e.clientY - r.top}px`);
      }

      const magnet = target.closest<HTMLElement>(".magnetic");
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        magnet.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${
          (e.clientY - r.top - r.height / 2) * 0.3
        }px)`;
      }
    }

    function onOut(e: PointerEvent) {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as HTMLElement | null;

      const tilt = target.closest<HTMLElement>(".tilt");
      if (tilt && !tilt.contains(related)) tilt.style.transform = "";

      const magnet = target.closest<HTMLElement>(".magnetic");
      if (magnet && !magnet.contains(related)) magnet.style.transform = "";
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, []);

  return null;
}
