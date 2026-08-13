import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setShareWhiteLabel } from "@/lib/audit/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const org = typeof body?.org === "string" && body.org.trim() ? body.org.trim().slice(0, 80) : null;

  const result = await setShareWhiteLabel(id, user.id, org);
  if (!result) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  return NextResponse.json({ token: result.token, share_url: `https://agentread.tech/report/${result.token}` });
}
