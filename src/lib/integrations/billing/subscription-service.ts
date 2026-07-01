import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/lib/types";

/** Applies billing outcomes to tenant plan + subscription records. */
export class SubscriptionService {
  private readonly db = createSupabaseAdminClient();

  async activatePro(tenantId: string, iyzicoRef?: string): Promise<void> {
    await this.setPlan(tenantId, "pro");
    await this.db.from("subscriptions").upsert(
      {
        tenant_id: tenantId,
        plan: "pro",
        iyzico_ref: iyzicoRef ?? null,
        status: "active",
      },
      { onConflict: "tenant_id" },
    );
  }

  async downgradeToFree(tenantId: string): Promise<void> {
    await this.setPlan(tenantId, "free");
    await this.db
      .from("subscriptions")
      .update({ status: "cancelled", plan: "free" })
      .eq("tenant_id", tenantId);
  }

  private async setPlan(tenantId: string, plan: PlanId): Promise<void> {
    await this.db.from("tenants").update({ plan }).eq("id", tenantId);
  }
}
