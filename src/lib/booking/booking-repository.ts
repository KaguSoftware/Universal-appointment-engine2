import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Appointment,
  AvailabilityOverride,
  AvailabilityRule,
  Service,
  Staff,
  Tenant,
} from "@/lib/types";

interface AvailabilityData {
  rules: AvailabilityRule[];
  overrides: AvailabilityOverride[];
  appointments: Pick<Appointment, "start_at" | "end_at">[];
}

/**
 * Read access for the public booking flow. Wraps the SECURITY DEFINER RPCs so
 * anon/customer callers never touch tenant tables directly.
 */
export class BookingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getTenant(slug: string): Promise<Tenant | null> {
    const { data, error } = await this.supabase
      .rpc("public_get_tenant", { p_slug: slug })
      .maybeSingle<Tenant>();
    if (error) throw error;
    return data ?? null;
  }

  async listServices(tenantId: string): Promise<Service[]> {
    const { data, error } = await this.supabase.rpc("public_list_services", {
      p_tenant: tenantId,
    });
    if (error) throw error;
    return (data ?? []) as Service[];
  }

  async listStaffForService(serviceId: string): Promise<Staff[]> {
    const { data, error } = await this.supabase.rpc(
      "public_list_staff_for_service",
      { p_service: serviceId },
    );
    if (error) throw error;
    return (data ?? []) as Staff[];
  }

  async getAvailabilityData(
    staffId: string,
    fromISO: string,
    toISO: string,
    excludeAppointmentId?: string,
  ): Promise<AvailabilityData> {
    const { data, error } = excludeAppointmentId
      ? await this.supabase.rpc("public_availability_data_excluding", {
          p_staff: staffId,
          p_from: fromISO,
          p_to: toISO,
          p_exclude: excludeAppointmentId,
        })
      : await this.supabase.rpc("public_availability_data", {
          p_staff: staffId,
          p_from: fromISO,
          p_to: toISO,
        });
    if (error) throw error;
    return data as AvailabilityData;
  }
}
