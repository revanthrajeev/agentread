import { createClient } from "@/lib/supabase/server";
import NavClient from "@/components/NavClient";

/**
 * A broken/unconfigured Supabase connection must never take down the whole site — this
 * renders on every page via RootLayout, so an unguarded throw here 500s the entire app,
 * including the public marketing homepage. Degrade to a signed-out nav instead.
 */
export default async function Nav() {
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch (err) {
    console.error("[Nav] failed to resolve auth session:", err);
  }

  return <NavClient userEmail={userEmail} />;
}
