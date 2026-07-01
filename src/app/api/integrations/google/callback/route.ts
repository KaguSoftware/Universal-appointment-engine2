import { NextResponse, type NextRequest } from "next/server";
import { CalendarSyncService } from "@/lib/integrations/google/calendar-sync-service";
import { GoogleCalendarProvider } from "@/lib/integrations/google/google-calendar-provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Google OAuth callback: exchanges the code and stores the staff tokens. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // "tenantId:staffId"

  const fail = NextResponse.redirect(`${origin}/admin/staff?google=error`);
  if (!code || !state) return fail;

  const [tenantId, staffId] = state.split(":");
  if (!tenantId || !staffId) return fail;

  // Ensure the caller is authenticated (admin surfaces are guarded elsewhere).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/auth/login`);

  try {
    const tokens = await new GoogleCalendarProvider().exchangeCode(code);
    await new CalendarSyncService().saveTokens(staffId, tenantId, tokens);
  } catch {
    return fail;
  }

  return NextResponse.redirect(`${origin}/admin/staff?google=connected`);
}
