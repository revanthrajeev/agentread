import * as Sentry from "@sentry/nextjs";

// No-op unless NEXT_PUBLIC_SENTRY_DSN is set — see src/sentry.server.config.ts.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
