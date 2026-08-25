"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/#layers",    label: "Product" },
  { href: "/playground", label: "Playground" },
  { href: "/dashboard",  label: "Dashboard" },
  { href: "/docs",       label: "Docs" },
  { href: "/faq",        label: "FAQ" },
  { href: "/pricing",    label: "Pricing" },
];

export default function NavClient({ userEmail }: { userEmail: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme]       = useState<"light" | "dark">("light");
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sync theme state from the <html> attribute on mount and after toggle
  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ar-theme", next); } catch {}
    setTheme(next);
  };

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner-wrap">
        <div className="nav-inner">
          {/* Logo */}
          <Link className="logo" href="/">
            <span className="logo-mark" aria-hidden="true">
              <img src="/logo-icon.svg" alt="" width={20} height={20} />
            </span>
            <span className="logo-text">agentread</span>
          </Link>

          {/* Nav links */}
          <div className="nav-links">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                className="nav-link"
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right cluster */}
          <div className="nav-right">
            {/* Theme toggle */}
            <button
              className="icon-btn"
              type="button"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            >
              {/* Sun — shown in dark mode */}
              <svg
                className="theme-icon-sun"
                width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              {/* Moon — shown in light mode */}
              <svg
                className="theme-icon-moon"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
              </svg>
            </button>

            {/* Auth buttons */}
            {userEmail ? (
              <form action="/auth/signout" method="post">
                <button className="btn btn-ghost btn-sm" type="submit" title={userEmail}>
                  Sign out
                </button>
              </form>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm" href="/login">
                  Log in
                </Link>
                <Link className="btn btn-primary btn-sm" href="/login">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
