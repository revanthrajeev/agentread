/**
 * "Agent runtime" diagram — mirrors the GEOly reference's TRIGGERS / AGENT RUNTIME /
 * CAPABILITIES panel: three labeled columns whose nodes connect to a glowing orbiting
 * core with curved gradient beams. Every label here is a real AgentRead trigger/job/
 * capability (cron schedule, webhook, PR review; the audit/autofix/watch/serve jobs; the
 * outputs they produce) — not decorative placeholder text.
 */
const TRIGGERS = [
  { label: "Scheduled re-audit", sub: "Runs on your watch cadence", icon: <IconClock />, tone: "green" },
  { label: "New audit requested", sub: "From the dashboard or API", icon: <IconSearch />, tone: "blue" },
  { label: "PR merged", sub: "Autofix diff landed on the branch", icon: <IconMerge />, tone: "purple" },
  { label: "Score drop alert", sub: "Regression past your threshold", icon: <IconBell />, tone: "amber" },
];
const CAPABILITIES = [
  { label: "Crawl + score", sub: "llms.txt → sitemap → links", icon: <IconRadar />, tone: "teal" },
  { label: "Open a PR", sub: "One reviewable diff, never a push", icon: <IconMerge />, tone: "purple" },
  { label: "Serve Markdown", sub: "Clean twin for verified crawlers", icon: <IconSend />, tone: "blue" },
  { label: "Notify webhook", sub: "On drop only, never on \"fine\"", icon: <IconBell />, tone: "amber" },
];
const ORBIT_LABELS = [
  { label: "Memory", left: "8%", top: "36%" },
  { label: "Routing", left: "80%", top: "32%" },
  { label: "Planner", left: "12%", top: "74%" },
  { label: "Tools", left: "82%", top: "72%" },
  { label: "Runtime", left: "45%", top: "94%" },
];

export default function OrchestrationDiagram() {
  return (
    <div className="orch-panel glass">
      <span className="orch-status">
        <span className="orch-status-dot" />
        Runtime active
      </span>
      <div className="orch-grid">
        <div className="orch-col">
          <div className="orch-col-label">Triggers</div>
          {TRIGGERS.map((t) => (
            <div key={t.label} className="orch-node orch-node-left">
              <span className={`orch-node-icon tone-${t.tone}`}>{t.icon}</span>
              <span>
                <span className="orch-node-title">{t.label}</span>
                <span className="orch-node-sub">{t.sub}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="orch-col orch-col-center">
          <svg
            className="orch-lines"
            viewBox="0 0 200 220"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="orch-grad-in" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--accent-b)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--accent-b)" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="orch-grad-out" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.9" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {TRIGGERS.map((_, i) => {
              const y = 24 + i * 56;
              return (
                <path
                  key={`in-${i}`}
                  className="orch-line"
                  style={{ animationDelay: `${i * 0.25}s` }}
                  d={`M0,${y} C 70,${y} 90,110 100,110`}
                  fill="none"
                  stroke="url(#orch-grad-in)"
                />
              );
            })}
            {CAPABILITIES.map((_, i) => {
              const y = 24 + i * 56;
              return (
                <path
                  key={`out-${i}`}
                  className="orch-line orch-line-out"
                  style={{ animationDelay: `${0.6 + i * 0.25}s` }}
                  d={`M100,110 C 110,110 130,${y} 200,${y}`}
                  fill="none"
                  stroke="url(#orch-grad-out)"
                />
              );
            })}
          </svg>

          <div className="orch-hub-ring">
            <span className="orch-hub-caption">Agent core</span>
            <div className="orch-hub-orbit" aria-hidden="true" />
            <div className="orch-hub-orbit orch-hub-orbit-2" aria-hidden="true" />
            {ORBIT_LABELS.map((o) => (
              <span key={o.label} className="orch-orbit-label" style={{ left: o.left, top: o.top }}>
                {o.label}
              </span>
            ))}
            <div className="orch-hub-core">
              <img src="/logo-icon.svg" alt="" width={26} height={26} />
            </div>
          </div>
        </div>

        <div className="orch-col">
          <div className="orch-col-label">Capabilities</div>
          {CAPABILITIES.map((c) => (
            <div key={c.label} className="orch-node orch-node-right">
              <span className={`orch-node-icon tone-${c.tone}`}>{c.icon}</span>
              <span>
                <span className="orch-node-title">{c.label}</span>
                <span className="orch-node-sub">{c.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconMerge() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="18" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8.2V15.8M9 6h4a4 4 0 0 1 4 4v5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3a5 5 0 0 0-5 5v3.2c0 .8-.3 1.6-.9 2.2L5 14.7c-.5.5-.2 1.3.5 1.3h13c.7 0 1-.8.5-1.3l-1.1-1.3a3.2 3.2 0 0 1-.9-2.2V8a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconRadar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <path d="M12 12 18 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M21 3 3 10.5l7 2.5m11-10L15.5 21l-2.5-8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
