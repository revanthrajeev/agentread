"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="container" style={{ maxWidth: 400, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", paddingBlock: 64 }}>
      <div className="glass" style={{ padding: 36, borderRadius: "var(--r-lg)" }}>
        <div className="logo" style={{ marginBottom: 28 }}>
          <span className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.4" stroke="white" strokeWidth="2.2" />
              <circle cx="8" cy="8" r="2.2" fill="white" />
            </svg>
          </span>
          agentread
        </div>

        <h1 className="title" style={{ fontSize: 26 }}>
          Sign in
        </h1>
        <p className="lead" style={{ fontSize: 14, marginTop: 8 }}>
          Access your dashboard, API keys and read history.
        </p>

        <button onClick={signInWithGoogle} className="btn btn-ghost" style={{ width: "100%", marginTop: 28 }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 6 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.3 10.4z" />
            <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.6C29.6 35.4 27 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.6 5.1C9.9 39.7 16.4 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6.1l6.6 5.6C41.9 36.8 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0", fontSize: 12, color: "var(--muted)" }}>
          <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
          or
          <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={sendMagicLink} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="scan-input"
          />
          <button type="submit" disabled={status === "sending"} className="btn btn-primary" style={{ width: "100%" }}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {status === "sent" && (
          <p style={{ marginTop: 16, fontSize: 14, color: "var(--st-good)" }}>
            Check your email — click the link to finish signing in.
          </p>
        )}
        {status === "error" && (
          <p style={{ marginTop: 16, fontSize: 14, color: "var(--st-critical)" }}>{errorMsg}</p>
        )}

        <p style={{ marginTop: 28, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          Google sign-in needs a Google OAuth client configured in Supabase — see SETUP.md. Magic
          link works out of the box once Supabase env vars are set.
        </p>
      </div>
    </main>
  );
}
