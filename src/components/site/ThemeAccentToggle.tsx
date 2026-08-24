"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark only — the four-accent-color picker (violet/cyan/emerald/amber) this used to
 * expose was cut. Violet is the brand color used throughout the logo and every gradient on
 * the site; letting visitors switch it added a surface no one asked for and diluted the one
 * color the brand should be recognized by. Keeping the toggle purely to theme.
 */
export default function ThemeAccentToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Hydrating a persisted client-only preference (localStorage doesn't exist during SSR) —
  // this has to run in an effect; setting theme state here mirrors it for the UI (icon
  // swap), it's not React state that could be set during render instead.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const savedTheme = localStorage.getItem("ar-theme") as "dark" | "light" | null;
    if (savedTheme) {
      document.documentElement.dataset.theme = savedTheme;
      setTheme(savedTheme);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ar-theme", next);
    setTheme(next);
  }

  return (
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
  );
}
