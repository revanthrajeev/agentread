import LoginForm from "@/components/LoginForm";

// Route segment config only takes effect from a Server Component file — a "use client"
// page.tsx silently ignores it. This page has to stay a thin server wrapper for that reason.
// Purely client-interactive (no server data, nothing worth prerendering) — force-dynamic skips
// Next's build-time trial render, which would otherwise construct a Supabase browser client
// (and throw for real, not just a dynamic-bailout signal) on any host where env vars are only
// injected at request/runtime rather than build time.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
