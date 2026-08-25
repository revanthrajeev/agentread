/**
 * "Page era vs Agent era" diagram — the real shift AgentRead is built for. Top row is the
 * old path a page was built for (person clicks a link, a browser renders it). Bottom is a
 * glowing decision wheel: a real AI crawler fetches raw HTML with no JS run, AgentRead
 * parses/verifies/serves/fixes it, and the model either cites the brand or skips it.
 */
const SATELLITES = [
  { key: "parse", pos: "tl", eyebrow: "Readable", name: "Parse the page", sub: "Text vs. JS-only content", icon: <IconFile />, tone: "green" },
  { key: "verify", pos: "tr", eyebrow: "Trust", name: "Verify signals", sub: "robots.txt, llms.txt, crawler rules", icon: <IconShield />, tone: "blue" },
  { key: "serve", pos: "bl", eyebrow: "Transaction", name: "Serve Markdown", sub: "Clean twin for verified crawlers", icon: <IconSend />, tone: "amber" },
  { key: "fix", pos: "br", eyebrow: "Handoff", name: "Ship the fix", sub: "One reviewable pull request", icon: <IconWrench />, tone: "pink" },
] as const;

export default function EraDiagram() {
  return (
    <div className="era-panel glass">
      <div className="era-top">
        <span className="era-row-label">Page era</span>
        <div className="era-flow">
          <div className="era-node">
            <IconUser /> User
          </div>
          <div className="era-arrow" aria-hidden="true">→</div>
          <div className="era-node">
            <IconSearch /> Search result
          </div>
          <div className="era-arrow" aria-hidden="true">→</div>
          <div className="era-node">
            <IconLayout /> Rendered page
          </div>
        </div>
      </div>

      <div className="era-agent">
        <span className="era-row-label era-row-label-accent">Agent era</span>

        <div className="era-diamond">
          <svg className="era-diamond-svg" viewBox="0 0 230 100" aria-hidden="true">
            <defs>
              <linearGradient id="beam-green" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#22c55e" stopOpacity="0.9" />
                <stop offset="1" stopColor="#22c55e" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="beam-blue" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="1" stopColor="#3b82f6" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="beam-amber" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#f59e0b" stopOpacity="0.9" />
                <stop offset="1" stopColor="#f59e0b" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="beam-pink" x1="1" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#ec4899" stopOpacity="0.9" />
                <stop offset="1" stopColor="#ec4899" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Beams start at the AgentRead card's actual edge (half-extents ~23x10 viewBox
                units for its 220px width) rather than the card's center point, and stop at
                75% of the way to each satellite so they clear that card's body too. */}
            <path className="era-beam" d="M92,41 L54.6,26" stroke="url(#beam-green)" style={{ color: "#22c55e" }} />
            <path className="era-beam" d="M137,40 L173.7,23.75" stroke="url(#beam-blue)" style={{ color: "#3b82f6", animationDelay: "0.3s" }} />
            <path className="era-beam" d="M92,58 L49.5,74" stroke="url(#beam-amber)" style={{ color: "#f59e0b", animationDelay: "0.6s" }} />
            <path className="era-beam" d="M138,59 L177.1,75.5" stroke="url(#beam-pink)" style={{ color: "#ec4899", animationDelay: "0.9s" }} />
          </svg>

          <div className="era-node-card era-node-center">
            <span className="era-node-icon tone-core">
              <IconBot />
            </span>
            <span>
              <span className="era-node-eyebrow">Decision layer</span>
              <span className="era-node-name">AgentRead</span>
              <span className="era-node-sub">Reads, scores, and fixes what the crawler sees</span>
            </span>
          </div>

          {SATELLITES.map((s) => (
            <div key={s.key} className={`era-node-card era-node-${s.pos}`}>
              <span className={`era-node-icon tone-${s.tone}`}>{s.icon}</span>
              <span>
                <span className="era-node-eyebrow">{s.eyebrow}</span>
                <span className="era-node-name">{s.name}</span>
                <span className="era-node-sub">{s.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconUser() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c1.5-4 4-6 7-6s5.5 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconLayout() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9h17" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 2.5h8l5 5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 13h7M8.5 17h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5-4.6-1.1-8-4.5-8-9.5V6l8-3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m8.5 12 2.4 2.4L16 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 3 3 10.5l7 2.5m11-10L15.5 21l-2.5-8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function IconWrench() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 4.6L3 17.2V21h3.8l6.3-6.3a4 4 0 0 0 4.6-5.4l-2.7 2.7-2.6-.6-.6-2.6 2.9-2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconBot() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8V4.5M9 4.5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="9" cy="13.5" r="1.3" fill="currentColor" />
      <circle cx="15" cy="13.5" r="1.3" fill="currentColor" />
    </svg>
  );
}
