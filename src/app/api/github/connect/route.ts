import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hint, isEncryptionConfigured, seal } from "@/lib/crypto/secrets";
import { loadRepoContext, parseRepoUrl, verifyAccess } from "@/lib/github/client";

/**
 * Connects a GitHub repository. The token is verified for push access *before* it is
 * stored, so a token that can't open a PR is rejected at connect time rather than
 * failing later mid-job after inference has already been spent.
 */

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  if (!isEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          "SECRETS_ENCRYPTION_KEY is not configured on this deployment. Refusing to store a GitHub token unencrypted.",
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const repoUrl = typeof body?.repo === "string" ? body.repo : null;
  const token = typeof body?.token === "string" ? body.token.trim() : null;

  if (!repoUrl || !token) {
    return NextResponse.json({ error: "Both `repo` and `token` are required." }, { status: 400 });
  }

  const ref = parseRepoUrl(repoUrl);
  if (!ref) {
    return NextResponse.json(
      { error: "Could not parse that repository. Use owner/repo or a github.com URL." },
      { status: 400 }
    );
  }

  const access = await verifyAccess(token, ref);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 400 });
  }

  try {
    const context = await loadRepoContext(token, ref);
    const sealed = seal(token);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("github_connections")
      .upsert(
        {
          user_id: user.id,
          owner: ref.owner,
          repo: ref.repo,
          default_branch: context.defaultBranch,
          framework: context.framework,
          token_ciphertext: sealed.ciphertext,
          token_iv: sealed.iv,
          token_tag: sealed.tag,
          token_hint: hint(token),
          active: true,
        },
        { onConflict: "user_id,owner,repo" }
      )
      .select("id, owner, repo, default_branch, framework, token_hint, connected_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      connection: data,
      files_indexed: context.tree.length,
      framework: context.framework,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not connect the repository.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  // Selects only non-secret columns — the ciphertext never leaves the server.
  const { data, error } = await supabase
    .from("github_connections")
    .select("id, owner, repo, default_branch, framework, token_hint, connected_at, last_used_at, active")
    .order("connected_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // RLS scopes the delete to the caller's own rows.
  const { error } = await supabase.from("github_connections").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
