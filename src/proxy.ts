import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Next.js 16 Proxy (formerly Middleware): keeps the Supabase session fresh. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on all paths except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
