import { NextResponse, type NextRequest } from "next/server";
import { GoogleCalendarProvider } from "@/lib/integrations/google/google-calendar-provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Starts the Google Calendar consent flow for a staff member of the caller. */
export async function GET(request: NextRequest) {
  const staffId = new URL(request.url).searchParams.get("staff");
  if (!staffId) return NextResponse.json({ error: "missing staff" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

  // Confirm the caller is an admin of the tenant that owns this staff member.
  const { data: staff } = await supabase
    .from("staff")
    .select("id, tenant_id")
    .eq("id", staffId)
    .maybeSingle();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new GoogleCalendarProvider().authUrl(
    `${staff.tenant_id}:${staff.id}`,
  );
  return NextResponse.redirect(url);
}
