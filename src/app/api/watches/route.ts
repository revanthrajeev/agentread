import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanForUser } from "@/lib/billing/usage";
import { isUnlimited } from "@/lib/billing/plans";
import { canonicalize } from "@/lib/engine/crawl";

/** Session-authenticated CRUD for scheduled monitors, used by the dashboard. */

export async function GET() {
  const user = await requireUser();
  if ("error" in user) return user.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ watches: data ?? [] });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if ("error" in user) return user.error;

  const body = await request.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url : null;
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  const normalized = canonicalize(/^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`);
  if (!normalized) {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }

  const plan = await getPlanForUser(user.id);
  if (plan.limits.watches === 0) {
    return NextResponse.json(
      {
        error: "Scheduled monitoring is a paid feature. Upgrade to Pro to watch a site.",
        code: "upgrade_required",
      },
      { status: 402 }
    );
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("watches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("active", true);

  if (!isUnlimited(plan.limits.watches) && (count ?? 0) >= plan.limits.watches) {
    return NextResponse.json(
      {
        error: `Your ${plan.name} plan allows ${plan.limits.watches} active monitors.`,
        code: "quota_exceeded",
      },
      { status: 402 }
    );
  }

  // Daily checks are a Scale feature; Pro watches settle to weekly rather than being rejected.
  const requestedFrequency = body?.frequency === "daily" ? "daily" : "weekly";
  const frequency =
    requestedFrequency === "daily" && plan.id === "pro" ? "weekly" : requestedFrequency;

  const pages = Math.max(
    1,
    Math.min(Number(body?.pages) || 10, plan.limits.pagesPerAudit)
  );

  const { data, error } = await admin
    .from("watches")
    .insert({
      user_id: user.id,
      root_url: normalized,
      host: new URL(normalized).host,
      frequency,
      pages,
      alert_email: typeof body?.alert_email === "string" ? body.alert_email : null,
      webhook_url: typeof body?.webhook_url === "string" ? body.webhook_url : null,
      alert_threshold: Math.max(1, Math.min(Number(body?.alert_threshold) || 5, 100)),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ watch: data, frequency_adjusted: frequency !== requestedFrequency });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if ("error" in user) return user.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // RLS scopes this to the caller's own rows, so a forged id can't delete someone else's watch.
  const supabase = await createClient();
  const { error } = await supabase.from("watches").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

async function requireUser(): Promise<{ id: string } | { error: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  return { id: user.id };
}
