"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeAccentToggle from "@/components/site/ThemeAccentToggle";

const LINKS = [
  { href: "/#layers", label: "Product" },
  { href: "/playground", label: "Playground" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "Docs" },
  { href: "/#pricing", label: "Pricing" },
];

export default function NavClient({ userEmail }: { userEmail: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-inner">
        <Link className="logo" href="/">
          <span className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.4" stroke="white" strokeWidth="2.2" />
              <circle cx="8" cy="8" r="2.2" fill="white" />
            </svg>
          </span>
          agentread
        </Link>
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
        <div className="nav-right">
          <ThemeAccentToggle />
          {userEmail ? (
            <form action="/auth/signout" method="post">
              <button className="btn btn-ghost btn-sm" type="submit" title={userEmail}>
                Sign out
              </button>
            </form>
          ) : (
            <Link className="btn btn-primary btn-sm" href="/login">
              Get started
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
