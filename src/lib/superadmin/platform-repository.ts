import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PlanId, Tenant } from "@/lib/types";

export type TenantSummary = Tenant & { staff_count: number };

/**
 * Platform-wide reads/writes across all tenants. Uses the service-role client
 * (RLS bypass); only reachable behind {@link requireSuperadmin}.
 */
export class PlatformRepository {
  private readonly db = createSupabaseAdminClient();

  async listTenants(): Promise<TenantSummary[]> {
    const { data, error } = await this.db
      .from("tenants")
      .select("*, staff(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((t) => {
      const { staff, ...rest } = t as Tenant & {
        staff: { count: number }[];
      };
      return { ...rest, staff_count: staff?.[0]?.count ?? 0 } as TenantSummary;
    });
  }

  async setPlan(tenantId: string, plan: PlanId): Promise<void> {
    const { error } = await this.db
      .from("tenants")
      .update({ plan })
      .eq("id", tenantId);
    if (error) throw error;
  }

  async setStatus(
    tenantId: string,
    status: "active" | "suspended",
  ): Promise<void> {
    const { error } = await this.db
      .from("tenants")
      .update({ status })
      .eq("id", tenantId);
    if (error) throw error;
  }
}
