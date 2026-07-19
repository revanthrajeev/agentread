import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// withSentryConfig is safe to apply even with no DSN configured — it only affects the
// build (source map upload, which itself no-ops without SENTRY_AUTH_TOKEN), not runtime
// behavior. Sentry.init() calls in src/sentry.server.config.ts and
// src/instrumentation-client.ts are what actually gate on a DSN being present.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  telemetry: false,
});
