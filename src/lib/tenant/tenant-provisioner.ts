import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { VerticalId } from "@/lib/types";
import { getPreset } from "@/lib/verticals";

export interface ProvisionInput {
  ownerUserId: string;
  ownerName: string;
  businessName: string;
  slug: string;
  vertical: VerticalId;
  timezone: string;
}

/**
 * Creates a new tenant from a vertical preset: tenant row, owner membership
 * (admin), seed services, and a default staff member linked to the owner.
 * Uses the service-role client so seeding isn't blocked by RLS bootstrap.
 */
export class TenantProvisioner {
  private readonly db = createSupabaseAdminClient();

  async provision(input: ProvisionInput): Promise<{ tenantId: string }> {
    const preset = getPreset(input.vertical);

    const { data: tenant, error: tErr } = await this.db
      .from("tenants")
      .insert({
        slug: input.slug,
        name: input.businessName,
        vertical: input.vertical,
        timezone: input.timezone,
      })
      .select("id")
      .single();
    if (tErr) throw new Error(tErr.message);
    const tenantId = tenant.id as string;

    await this.db.from("memberships").insert({
      tenant_id: tenantId,
      user_id: input.ownerUserId,
      role: "admin",
    });

    const { data: staff } = await this.db
      .from("staff")
      .insert({
        tenant_id: tenantId,
        profile_id: input.ownerUserId,
        display_name: input.ownerName || preset.terminology.provider,
        color: preset.theme.accent,
      })
      .select("id")
      .single();

    const services = preset.seedServices.map((s) => ({
      tenant_id: tenantId,
      name: s.name,
      description: s.description ?? null,
      duration_min: s.duration_min,
      buffer_after_min: s.buffer_after_min ?? 0,
      price: s.price,
    }));
    const { data: inserted } = await this.db
      .from("services")
      .insert(services)
      .select("id");

    // Link the default staff member to every seeded service.
    if (staff && inserted) {
      await this.db.from("staff_services").insert(
        inserted.map((svc) => ({ staff_id: staff.id, service_id: svc.id })),
      );
    }

    return { tenantId };
  }
}
