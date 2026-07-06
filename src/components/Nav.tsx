import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.4" stroke="white" strokeWidth="2.2" />
              <circle cx="8" cy="8" r="2.2" fill="white" />
            </svg>
          </span>
          agentread
        </Link>
        <div className="hidden gap-1 sm:flex">
          <Link href="/playground" className="rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white">
            Playground
          </Link>
          <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white">
            Dashboard
          </Link>
          <Link href="/docs" className="rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white">
            Docs
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-neutral-400 sm:inline">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
