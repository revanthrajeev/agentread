import { createClient } from "@/lib/supabase/server";
import NavClient from "@/components/NavClient";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <NavClient userEmail={user?.email ?? null} />;
}
