const ENGINES = [
  { name: "ChatGPT", icon: <IconChatGPT /> },
  { name: "Claude", icon: <IconClaude /> },
  { name: "Perplexity", icon: <IconPerplexity /> },
  { name: "Gemini", icon: <IconGemini /> },
  { name: "Google AI Mode", icon: <IconGoogle /> },
  { name: "Copilot", icon: <IconCopilot /> },
  { name: "Google AI Overview", icon: <IconGoogle /> },
];

export default function AiEnginesBar() {
  // Quadrupled, not doubled — a container wider than one copy's width would otherwise
  // show a blank gap right before the loop wraps. See Marquee.tsx for the same fix.
  const quadrupled = [...ENGINES, ...ENGINES, ...ENGINES, ...ENGINES];
  return (
    <section className="engines-bar">
      <div className="container engines-bar-inner">
        <div className="engines-bar-label">
          <h3>Across every major AI engine</h3>
          <p>
            ChatGPT, Gemini, Perplexity, Copilot, and Google AI — tracked daily across major
            markets.
          </p>
        </div>
        <div className="engines-bar-track">
          <div
            className="engines-bar-pills"
            aria-hidden="true"
            style={{ "--marquee-shift": "-25%" } as React.CSSProperties}
          >
            {quadrupled.map((e, i) => (
              <span className="engine-pill" key={`${e.name}-${i}`}>
                <span className="engine-pill-icon">{e.icon}</span>
                {e.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function IconPerplexity() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 3 8v8l9 6 9-6V8l-9-6Z"
        stroke="#20B8CD"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 2v20M3 8l9 6 9-6" stroke="#20B8CD" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function IconGemini() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2c0 5.5-4.5 10-10 10 5.5 0 10 4.5 10 10 0-5.5 4.5-10 10-10-5.5 0-10-4.5-10-10Z"
        fill="url(#gem)"
      />
      <defs>
        <linearGradient id="gem" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0" stopColor="#4C8DF6" />
          <stop offset="0.5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconGoogle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.85-.08-1.66-.22-2.44H12v4.62h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1C3.24 21.3 7.28 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.26a12 12 0 0 0 0 10.78l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.26 6.61l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function IconCopilot() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="8" r="5.5" fill="#8C6CF6" />
      <circle cx="16" cy="16" r="5.5" fill="#3ED6B5" />
      <circle cx="8" cy="8" r="5.5" fill="url(#cp1)" fillOpacity="0.85" />
      <defs>
        <radialGradient id="cp1" cx="0" cy="0" r="1" gradientTransform="translate(8 8) scale(5.5)">
          <stop stopColor="#B197FC" />
          <stop offset="1" stopColor="#8C6CF6" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function IconClaude() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M7.5 3 3 20h3.6l1-3.2h6.8l1 3.2H19L14.5 3H7.5Zm.6 11 2.4-8 2.4 8H8.1Z"
        fill="#D97757"
      />
    </svg>
  );
}

function IconChatGPT() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.3 9.9a5.1 5.1 0 0 0-.44-4.2 5.2 5.2 0 0 0-5.6-2.5A5.2 5.2 0 0 0 11.5 1a5.2 5.2 0 0 0-5 3.5 5.2 5.2 0 0 0-3.4 2.5 5.1 5.1 0 0 0 .63 6 5.1 5.1 0 0 0 .44 4.2 5.2 5.2 0 0 0 5.6 2.5A5.2 5.2 0 0 0 12.5 23a5.2 5.2 0 0 0 5-3.55 5.2 5.2 0 0 0 3.4-2.5 5.1 5.1 0 0 0-.6-6.05Z"
        stroke="#10A37F"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
