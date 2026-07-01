import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/types";
import { NotificationDispatcher } from "./dispatcher";
import type { NotificationType } from "./types";

/**
 * Loads everything a notification needs for a given appointment and dispatches
 * it. Runs with the service-role client so it works from actions, webhooks and
 * cron alike. Failures are swallowed — notifications must never block booking.
 */
export class AppointmentNotifier {
  private readonly db = createSupabaseAdminClient();

  async notify(appointmentId: string, type: NotificationType): Promise<void> {
    try {
      const { data } = await this.db
        .from("appointments")
        .select(
          "id, start_at, customer_id, services(name), profiles(phone), tenants(*)",
        )
        .eq("id", appointmentId)
        .maybeSingle();
      if (!data) return;

      const row = data as unknown as {
        id: string;
        start_at: string;
        customer_id: string;
        services: { name: string };
        profiles: { phone: string | null } | null;
        tenants: Tenant;
      };

      const { data: userRes } = await this.db.auth.admin.getUserById(
        row.customer_id,
      );

      await new NotificationDispatcher().dispatch({
        tenant: row.tenants,
        appointmentId: row.id,
        serviceName: row.services.name,
        startAt: new Date(row.start_at),
        email: userRes?.user?.email ?? null,
        phone: row.profiles?.phone ?? null,
        type,
      });
    } catch {
      // Notifications are best-effort.
    }
  }
}
