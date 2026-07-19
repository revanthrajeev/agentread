import * as Sentry from "@sentry/nextjs";

// No-op unless SENTRY_DSN is actually configured — matches this codebase's established
// "an unconfigured optional layer must never require code changes to disable" pattern
// (see INTERNAL_SERVE_SECRET). Get a free DSN at sentry.io and set it as an env var.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
