import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvailabilityRule, Service, Staff } from "@/lib/types";

export interface StaffInput {
  display_name: string;
  bio?: string | null;
  color: string;
  active: boolean;
}

/** Tenant-scoped CRUD for staff, their service links and weekly availability. */
export class StaffRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async list(): Promise<Staff[]> {
    const { data, error } = await this.supabase
      .from("staff")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .order("display_name");
    if (error) throw error;
    return data as Staff[];
  }

  async activeCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", this.tenantId)
      .eq("active", true);
    if (error) throw error;
    return count ?? 0;
  }

  async create(input: StaffInput): Promise<Staff> {
    const { data, error } = await this.supabase
      .from("staff")
      .insert({ ...input, tenant_id: this.tenantId })
      .select("*")
      .single();
    if (error) throw error;
    return data as Staff;
  }

  async update(id: string, input: Partial<StaffInput>): Promise<void> {
    const { error } = await this.supabase
      .from("staff")
      .update(input)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("staff")
      .delete()
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  // --- service assignment ---------------------------------------------------

  async serviceIds(staffId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("staff_services")
      .select("service_id")
      .eq("staff_id", staffId);
    if (error) throw error;
    return (data ?? []).map((r) => r.service_id as string);
  }

  async setServices(staffId: string, serviceIds: string[]): Promise<void> {
    await this.supabase.from("staff_services").delete().eq("staff_id", staffId);
    if (serviceIds.length > 0) {
      const { error } = await this.supabase
        .from("staff_services")
        .insert(serviceIds.map((service_id) => ({ staff_id: staffId, service_id })));
      if (error) throw error;
    }
  }

  async servicesForAssignment(): Promise<Pick<Service, "id" | "name">[]> {
    const { data, error } = await this.supabase
      .from("services")
      .select("id, name")
      .eq("tenant_id", this.tenantId)
      .order("name");
    if (error) throw error;
    return data as Pick<Service, "id" | "name">[];
  }

  // --- weekly availability --------------------------------------------------

  async rules(staffId: string): Promise<AvailabilityRule[]> {
    const { data, error } = await this.supabase
      .from("availability_rules")
      .select("*")
      .eq("staff_id", staffId)
      .order("weekday");
    if (error) throw error;
    return data as AvailabilityRule[];
  }

  async replaceRules(
    staffId: string,
    rules: Omit<AvailabilityRule, "id" | "tenant_id" | "staff_id">[],
  ): Promise<void> {
    await this.supabase
      .from("availability_rules")
      .delete()
      .eq("staff_id", staffId);
    if (rules.length > 0) {
      const { error } = await this.supabase.from("availability_rules").insert(
        rules.map((r) => ({
          ...r,
          tenant_id: this.tenantId,
          staff_id: staffId,
        })),
      );
      if (error) throw error;
    }
  }
}
