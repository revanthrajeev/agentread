import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom has many internal dynamically-required files that break when Next.js's own
  // bundler tries to statically bundle it for serverless functions — confirmed via a real
  // Netlify Function crash ("Internal Server Error" on every route that imports engine/read.ts,
  // even before reaching that route's own code, i.e. a module-load failure). Opting it out
  // of bundling and using native Node.js require instead fixes it.
  serverExternalPackages: ["jsdom"],
};

export default nextConfig;
