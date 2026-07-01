import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Customer, Service, Staff } from "@/lib/types";

export type CustomerHistoryItem = Appointment & {
  services: Pick<Service, "name">;
  staff: Pick<Staff, "display_name">;
};

/** Tenant-scoped read/update for CRM customer records (RLS enforces tenant). */
export class CustomerRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  /** List customers, optionally filtered by a name/email/phone search term. */
  async list(search?: string): Promise<Customer[]> {
    let q = this.supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", this.tenantId);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      q = q.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }

    const { data, error } = await q.order("name").limit(200);
    if (error) throw error;
    return data as Customer[];
  }

  async get(id: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", this.tenantId)
      .maybeSingle<Customer>();
    if (error) throw error;
    return data ?? null;
  }

  /** All appointments linked to a customer, newest first. */
  async history(customerId: string): Promise<CustomerHistoryItem[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("*, services(name), staff(display_name)")
      .eq("tenant_id", this.tenantId)
      .eq("customer_record_id", customerId)
      .order("start_at", { ascending: false })
      .returns<CustomerHistoryItem[]>();
    if (error) throw error;
    return data ?? [];
  }

  async updateNotesTags(
    id: string,
    input: { notes?: string | null; tags?: string[] },
  ): Promise<void> {
    const { error } = await this.supabase
      .from("customers")
      .update(input)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }
}
