import Link from "next/link";

/**
 * Shared dashboard navigation. Previously the sidebar lived inline in dashboard/page.tsx with
 * most entries rendered as inert "soon" placeholders; these are real routes now.
 */

const ICONS = {
  overview: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  audit: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.35-4.35",
  analytics: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  keys: "M14 7h4a2 2 0 0 1 0 10h-4M10 7H6a2 2 0 0 0 0 10h4M8 12h8",
  watch: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8",
  llms: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z",
  autofix: "M14.7 6.3a4 4 0 0 1-5 5L5 16v3h3l4.7-4.7a4 4 0 0 0 5-5l-2.5 2.5-2-2 2.5-2.5Z",
  billing: "M2.5 5h19v14h-19zM2.5 10h19",
} as const;

export type DashSection =
  | "overview"
  | "audits"
  | "analytics"
  | "keys"
  | "watch"
  | "llms"
  | "autofix"
  | "billing";

export default function DashSidebar({ active }: { active: DashSection }) {
  return (
    <aside className="dash-side">
      <div className="side-group">
        <div className="side-title">Project</div>
        <SideLink href="/dashboard" icon={ICONS.overview} label="Overview" active={active === "overview"} />
        <SideLink href="/dashboard/audits" icon={ICONS.audit} label="Site audits" active={active === "audits"} />
        <SideLink href="/dashboard/analytics" icon={ICONS.analytics} label="Agent analytics" active={active === "analytics"} />
      </div>

      <div className="side-group">
        <div className="side-title">Product</div>
        <SideLink href="/dashboard#keys" icon={ICONS.keys} label="Read API keys" active={active === "keys"} />
        <SideLink href="/dashboard/watch" icon={ICONS.watch} label="Watch alerts" active={active === "watch"} />
        <SideLink href="/dashboard/llms-txt" icon={ICONS.llms} label="llms.txt Studio" active={active === "llms"} />
        <SideLink href="/dashboard/autofix" icon={ICONS.autofix} label="Autofix" active={active === "autofix"} />
      </div>

      <div className="side-group">
        <div className="side-title">Account</div>
        <SideLink href="/dashboard/billing" icon={ICONS.billing} label="Billing & usage" active={active === "billing"} />
      </div>
    </aside>
  );
}

function SideLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link className={`side-link${active ? " active" : ""}`} href={href}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d={icon} />
      </svg>
      {label}
    </Link>
  );
}
