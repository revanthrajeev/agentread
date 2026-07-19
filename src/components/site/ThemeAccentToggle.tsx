"use client";

import { useEffect, useState } from "react";

const ACCENTS = [
  { id: "violet", label: "Violet" },
  { id: "cyan", label: "Cyan" },
  { id: "emerald", label: "Emerald" },
  { id: "amber", label: "Amber" },
] as const;

export default function ThemeAccentToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<string>("violet");
  const [open, setOpen] = useState(false);

  // Hydrating a persisted client-only preference (localStorage doesn't exist during SSR) —
  // this has to run in an effect; setting theme/accent state here mirrors it for the UI
  // (active-swatch highlighting), it's not React state that could be set during render instead.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedTheme = localStorage.getItem("ar-theme") as "dark" | "light" | null;
    const savedAccent = localStorage.getItem("ar-accent");
    if (savedTheme) {
      document.documentElement.dataset.theme = savedTheme;
      setTheme(savedTheme);
    }
    if (savedAccent) {
      document.documentElement.dataset.accent = savedAccent;
      setAccent(savedAccent);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ar-theme", next);
    setTheme(next);
  }

  function pickAccent(id: string) {
    // <html>'s dataset is a global DOM singleton, not React-tracked state.
    /* eslint-disable react-hooks/immutability */
    if (id === "violet") {
      delete document.documentElement.dataset.accent;
      localStorage.removeItem("ar-accent");
    } else {
      document.documentElement.dataset.accent = id;
      localStorage.setItem("ar-accent", id);
    }
    /* eslint-enable react-hooks/immutability */
    setAccent(id);
  }

  return (
    <>
      <div className={`accent-pop ${open ? "open" : ""}`}>
        <button
          type="button"
          className="icon-btn"
          title="Accent color"
          aria-label="Accent color"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" stroke="none" opacity=".35" />
          </svg>
        </button>
        <div className="accent-menu">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.label}
              aria-label={a.label}
              className={`swatch sw-${a.id} ${accent === a.id ? "active" : ""}`}
              onClick={() => pickAccent(a.id)}
            />
          ))}
        </div>
      </div>
      <button type="button" className="icon-btn" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>
        <svg
          className="theme-icon-moon"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
        <svg
          className="theme-icon-sun"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    </>
  );
}
