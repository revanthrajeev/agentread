import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { serveMarkdownToCrawlers } from "@/lib/serve/agentReadMiddleware";

export async function proxy(request: NextRequest) {
  const markdownResponse = await serveMarkdownToCrawlers(request);
  if (markdownResponse) return markdownResponse;

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization,
     * so the auth session cookie stays fresh across the whole app.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
