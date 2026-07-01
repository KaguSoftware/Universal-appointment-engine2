import "server-only";
import { appUrl } from "@/lib/app-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/types";
import { NotificationDispatcher } from "./dispatcher";
import type { NotificationType } from "./types";

/** Absolute URL to the account-less management page for an appointment. */
function manageUrlFor(slug: string, token: string): string {
  return `${appUrl()}/book/${slug}/manage/${token}`;
}

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
          "id, start_at, customer_id, manage_token, guest_email, guest_phone, services(name), profiles(phone), tenants(*)",
        )
        .eq("id", appointmentId)
        .maybeSingle();
      if (!data) return;

      const row = data as unknown as {
        id: string;
        start_at: string;
        customer_id: string | null;
        manage_token: string;
        guest_email: string | null;
        guest_phone: string | null;
        services: { name: string };
        profiles: { phone: string | null } | null;
        tenants: Tenant;
      };

      // Prefer the logged-in customer's account contact; fall back to the guest
      // contact details captured at booking time.
      let email = row.guest_email;
      let phone = row.guest_phone ?? row.profiles?.phone ?? null;
      if (row.customer_id) {
        const { data: userRes } = await this.db.auth.admin.getUserById(
          row.customer_id,
        );
        email = userRes?.user?.email ?? email;
        phone = row.profiles?.phone ?? phone;
      }

      await new NotificationDispatcher().dispatch({
        tenant: row.tenants,
        appointmentId: row.id,
        serviceName: row.services.name,
        startAt: new Date(row.start_at),
        email,
        phone,
        manageUrl: manageUrlFor(row.tenants.slug, row.manage_token),
        type,
      });
    } catch {
      // Notifications are best-effort.
    }
  }
}
