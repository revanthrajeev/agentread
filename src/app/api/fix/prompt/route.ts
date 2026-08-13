import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAuditForGeneration } from "@/lib/audit/store";
import { planFixes } from "@/lib/fix/router";
import { buildExportPrompt } from "@/lib/fix/prompt";

/**
 * Free, zero-connection alternative to Autofix — exports the audit's findings as a
 * self-contained prompt for whatever coding agent the user already has open locally. No
 * GitHub connection, no desktop app, no file upload, no inference cost to AgentRead.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const auditId = new URL(request.url).searchParams.get("audit_id");
  if (!auditId) return NextResponse.json({ error: "Missing required param: audit_id" }, { status: 400 });

  const audit = await loadAuditForGeneration(auditId, user.id);
  if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  const plan = planFixes(auditId, audit);
  const prompt = buildExportPrompt(plan, audit);

  return new NextResponse(prompt, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
