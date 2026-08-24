/**
 * Small original line icons for the feature grid — plain geometric stroke shapes matching
 * the minimal style already used elsewhere on the site (see ThemeAccentToggle's sun/moon,
 * the hero-note checkmark). Not from any icon library; drawn to fit `.bento-icon`'s 42px
 * accent-tinted square.
 */
const common = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconAudit = () => (
  <svg {...common}><circle cx="8.5" cy="8.5" r="5.5" /><path d="M16.5 16.5 13 13" /><path d="M6 8.5 8 10.5 11.5 6.5" /></svg>
);
export const IconAutofix = () => (
  <svg {...common}><circle cx="5" cy="4.5" r="2" /><circle cx="5" cy="15.5" r="2" /><circle cx="15" cy="10" r="2" /><path d="M5 6.5v7" /><path d="M7 5.5h4a3 3 0 0 1 3 3v-.3" /></svg>
);
export const IconLlmsTxt = () => (
  <svg {...common}><path d="M5 2.5h7l3 3v12h-10z" /><path d="M12 2.5v3h3" /><path d="M7.5 10.5h5M7.5 13.5h5" /></svg>
);
export const IconAnalytics = () => (
  <svg {...common}><path d="M3 17V3" /><path d="M3 17h14" /><rect x="5.5" y="11" width="2.4" height="6" /><rect x="9.8" y="7" width="2.4" height="10" /><rect x="14.1" y="9.5" width="2.4" height="7.5" /></svg>
);
export const IconServe = () => (
  <svg {...common}><path d="M3 6.5h11" /><path d="M11 3.5 14 6.5 11 9.5" /><path d="M17 13.5H6" /><path d="M9 10.5 6 13.5 9 16.5" /></svg>
);
export const IconWatch = () => (
  <svg {...common}><path d="M3 10a7 7 0 0 1 12.5-4.3" /><path d="M15.5 2.5v3.5H12" /><circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" /><path d="M17 10a7 7 0 0 1-12.5 4.3" /><path d="M4.5 17.5V14H8" /></svg>
);
export const IconReport = () => (
  <svg {...common}><path d="M7 12.5 12.5 7" /><path d="M9.5 5.5h5v5" /><path d="M14.5 11.5v3.5h-9v-9H9" /></svg>
);
export const IconMcp = () => (
  <svg {...common}><circle cx="10" cy="10" r="2" /><circle cx="3.5" cy="4" r="1.6" /><circle cx="16.5" cy="4" r="1.6" /><circle cx="3.5" cy="16" r="1.6" /><circle cx="16.5" cy="16" r="1.6" /><path d="M5 5.2 8.4 8.6M15 5.2 11.6 8.6M5 14.8 8.4 11.4M15 14.8 11.6 11.4" /></svg>
);
export const IconMention = () => (
  <svg {...common}><circle cx="10" cy="10" r="7.5" /><circle cx="10" cy="10" r="3" /><path d="M13 10v1.2a2 2 0 0 0 4 0V10a7 7 0 1 0-3 5.75" /></svg>
);
export const IconCrawl = () => (
  <svg {...common}><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4l3 2" /></svg>
);
