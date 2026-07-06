"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createApiKey(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const secret = randomBytes(24).toString("base64url");
  const fullKey = `sk-ar-${secret}`;
  const prefix = `sk-ar-${secret.slice(0, 6)}…`;
  const hash = createHash("sha256").update(fullKey).digest("hex");

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    name: name || "default",
    key_prefix: prefix,
    key_hash: hash,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  // full key is only ever returned once, at creation time — never stored or shown again
  return fullKey;
}

export async function revokeApiKey(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
