import "server-only";
import { tenantAllows } from "@/lib/feature-gate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/types";
import {
  GoogleCalendarProvider,
  type StoredTokens,
} from "./google-calendar-provider";

/**
 * Persists Google tokens and mirrors appointments onto staff calendars.
 * Best-effort: sync failures never block booking. Gated by the Pro plan.
 */
export class CalendarSyncService {
  private readonly db = createSupabaseAdminClient();
  private readonly provider = new GoogleCalendarProvider();

  async saveTokens(
    staffId: string,
    tenantId: string,
    tokens: StoredTokens,
  ): Promise<void> {
    await this.db.from("staff_google_tokens").upsert({
      staff_id: staffId,
      tenant_id: tenantId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: tokens.expiry,
    });
    await this.db
      .from("staff")
      .update({ google_calendar_connected: true })
      .eq("id", staffId);
  }

  async disconnect(staffId: string): Promise<void> {
    await this.db.from("staff_google_tokens").delete().eq("staff_id", staffId);
    await this.db
      .from("staff")
      .update({ google_calendar_connected: false })
      .eq("id", staffId);
  }

  /** Create a calendar event for a newly booked appointment. */
  async pushEvent(params: {
    tenant: Tenant;
    staffId: string;
    appointmentId: string;
    summary: string;
    startISO: string;
    endISO: string;
  }): Promise<void> {
    if (!tenantAllows(params.tenant, "google_calendar")) return;
    const tokenRow = await this.tokens(params.staffId);
    if (!tokenRow) return;

    try {
      const eventId = await this.provider.createEvent(
        tokenRow.tokens,
        tokenRow.calendarId,
        {
          summary: params.summary,
          startISO: params.startISO,
          endISO: params.endISO,
          timeZone: params.tenant.timezone,
        },
      );
      if (eventId) {
        await this.db
          .from("appointments")
          .update({ google_event_id: eventId })
          .eq("id", params.appointmentId);
      }
    } catch {
      // best-effort
    }
  }

  /** Remove the calendar event for a cancelled appointment. */
  async removeEvent(
    tenant: Tenant,
    staffId: string,
    eventId: string | null,
  ): Promise<void> {
    if (!eventId || !tenantAllows(tenant, "google_calendar")) return;
    const tokenRow = await this.tokens(staffId);
    if (!tokenRow) return;
    try {
      await this.provider.deleteEvent(tokenRow.tokens, tokenRow.calendarId, eventId);
    } catch {
      // best-effort
    }
  }

  /** Load an appointment and push it to the staff member's Google calendar. */
  async pushForAppointment(appointmentId: string): Promise<void> {
    const { data } = await this.db
      .from("appointments")
      .select("id, staff_id, start_at, end_at, services(name), tenants(*)")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!data) return;
    const row = data as unknown as {
      id: string;
      staff_id: string;
      start_at: string;
      end_at: string;
      services: { name: string };
      tenants: Tenant;
    };
    await this.pushEvent({
      tenant: row.tenants,
      staffId: row.staff_id,
      appointmentId: row.id,
      summary: row.services.name,
      startISO: row.start_at,
      endISO: row.end_at,
    });
  }

  /** Load an appointment and remove its Google event on cancellation. */
  async removeForAppointment(appointmentId: string): Promise<void> {
    const { data } = await this.db
      .from("appointments")
      .select("staff_id, google_event_id, tenants(*)")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!data) return;
    const row = data as unknown as {
      staff_id: string;
      google_event_id: string | null;
      tenants: Tenant;
    };
    await this.removeEvent(row.tenants, row.staff_id, row.google_event_id);
  }

  private async tokens(
    staffId: string,
  ): Promise<{ tokens: StoredTokens; calendarId: string } | null> {
    const { data } = await this.db
      .from("staff_google_tokens")
      .select("access_token, refresh_token, expiry, calendar_id")
      .eq("staff_id", staffId)
      .maybeSingle();
    if (!data?.refresh_token) return null;
    return {
      tokens: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry: data.expiry,
      },
      calendarId: data.calendar_id ?? "primary",
    };
  }
}
