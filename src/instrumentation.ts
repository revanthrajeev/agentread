import * as Sentry from "@sentry/nextjs";

// Deliberately Node.js runtime only, not edge — src/proxy.ts already had one real incident
// this session where a dependency broke Netlify's Edge Function bundling (jsdom). Sentry's
// edge SDK is normally safe, but given that history this stays conservative: no edge
// instrumentation, so nothing new is added to proxy.ts's bundle. Server-side errors in
// proxy.ts still reach Netlify's own function logs via the existing console.error calls.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
