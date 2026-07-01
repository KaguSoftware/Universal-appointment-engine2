import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AppointmentNotifier } from "./appointment-notifier";

/** Look-ahead window (hours) in which upcoming appointments get a reminder. */
const WINDOW_START_HOURS = 23;
const WINDOW_END_HOURS = 25;

/**
 * Finds booked appointments ~24h out that haven't been reminded yet and sends
 * a reminder on each allowed channel. Idempotency is handled downstream by the
 * dispatcher via notifications_log.
 */
export class ReminderRunner {
  private readonly db = createSupabaseAdminClient();

  async run(): Promise<{ processed: number }> {
    const now = Date.now();
    const from = new Date(now + WINDOW_START_HOURS * 3_600_000).toISOString();
    const to = new Date(now + WINDOW_END_HOURS * 3_600_000).toISOString();

    const { data } = await this.db
      .from("appointments")
      .select("id")
      .eq("status", "booked")
      .gte("start_at", from)
      .lt("start_at", to);

    const rows = data ?? [];
    const notifier = new AppointmentNotifier();
    for (const row of rows) {
      await notifier.notify(row.id as string, "reminder");
    }
    return { processed: rows.length };
  }
}
