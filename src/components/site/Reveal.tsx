"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function Reveal({
  variant = "up",
  delay,
  inline = false,
  className = "",
  children,
}: {
  variant?: "up" | "left" | "right";
  delay?: 1 | 2 | 3 | 4 | 5 | 6;
  inline?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.unobserve(node);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node]);

  const base = variant === "left" ? "reveal-l" : variant === "right" ? "reveal-r" : "reveal";
  const cls = [base, inView && "in", delay && `d${delay}`, className].filter(Boolean).join(" ");

  return inline ? (
    <span ref={setNode} className={cls}>
      {children}
    </span>
  ) : (
    <div ref={setNode} className={cls}>
      {children}
    </div>
  );
}
