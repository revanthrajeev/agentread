"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="mt-6 font-medium" style={{ color: "var(--st-good)" }}>You&apos;re on the list — we&apos;ll email you.</p>;
  }

  return (
    <form onSubmit={submit} className="email-form">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        aria-label="Email address"
        className="email-input"
      />
      <button disabled={status === "loading"} className="btn btn-primary magnetic">
        {status === "loading" ? "Joining…" : "Join waitlist"}
      </button>
      {status === "error" && (
        <p className="text-sm sm:ml-3 sm:self-center" style={{ color: "var(--st-critical)" }}>
          Something went wrong.
        </p>
      )}
    </form>
  );
}
