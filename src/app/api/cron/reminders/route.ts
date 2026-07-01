import { NextResponse, type NextRequest } from "next/server";
import { ReminderRunner } from "@/lib/integrations/notifications/reminder-runner";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint (see vercel.json) that dispatches appointment reminders.
 * Authorized via the `Authorization: Bearer <CRON_SECRET>` header, which
 * Vercel Cron sends automatically when CRON_SECRET is configured.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await new ReminderRunner().run();
  return NextResponse.json({ ok: true, ...result });
}
