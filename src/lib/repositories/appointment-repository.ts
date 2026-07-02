import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Service, Staff } from "@/lib/types";

export type AppointmentWithRefs = Appointment & {
  services: Pick<Service, "name">;
  staff: Pick<Staff, "display_name" | "color">;
};

/** Tenant-scoped read access to appointments for admin/calendar surfaces. */
export class AppointmentRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  /** Non-cancelled appointments overlapping [fromISO, toISO). */
  async inRange(fromISO: string, toISO: string): Promise<AppointmentWithRefs[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("*, services(name), staff(display_name, color)")
      .eq("tenant_id", this.tenantId)
      .neq("status", "cancelled")
      .gte("start_at", fromISO)
      .lt("start_at", toISO)
      .order("start_at")
      .returns<AppointmentWithRefs[]>();
    if (error) throw error;
    return data ?? [];
  }

  /** Full service row for the appointment (used for payment/fee math). */
  async serviceForAppointment(id: string): Promise<Service | null> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("services(*)")
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .maybeSingle<{ services: Service }>();
    if (error) throw error;
    return data?.services ?? null;
  }

  async setStatus(
    id: string,
    status: Appointment["status"],
  ): Promise<void> {
    const { error } = await this.supabase
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }
}
