import type { SupabaseClient } from "@supabase/supabase-js";
import type { Service } from "@/lib/types";

export interface ServiceInput {
  name: string;
  description?: string | null;
  duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  price: number;
  active: boolean;
}

/** Tenant-scoped CRUD for services (RLS enforces the tenant boundary). */
export class ServiceRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async list(): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from("services")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .order("name");
    if (error) throw error;
    return data as Service[];
  }

  async create(input: ServiceInput): Promise<Service> {
    const { data, error } = await this.supabase
      .from("services")
      .insert({ ...input, tenant_id: this.tenantId })
      .select("*")
      .single();
    if (error) throw error;
    return data as Service;
  }

  async update(id: string, input: Partial<ServiceInput>): Promise<void> {
    const { error } = await this.supabase
      .from("services")
      .update(input)
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("services")
      .delete()
      .eq("id", id)
      .eq("tenant_id", this.tenantId);
    if (error) throw error;
  }
}
