"use server";

import { revalidatePath } from "next/cache";
import { tenantAllows } from "@/lib/feature-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";
import type { TenantTheme } from "@/lib/types";

export async function updateSettings(formData: FormData): Promise<void> {
  const ctx = await TenantContext.require();
  ctx.requireAdmin();
  const supabase = await createSupabaseServerClient();

  const theme: TenantTheme = { ...ctx.tenant.theme };
  // Custom branding is a Pro feature; ignore theme fields on Free.
  if (tenantAllows(ctx.tenant, "custom_branding")) {
    theme.primary = String(formData.get("primary") || "") || undefined;
    theme.accent = String(formData.get("accent") || "") || undefined;
    theme.terminology = {
      provider: String(formData.get("term_provider") || "") || undefined,
      service: String(formData.get("term_service") || "") || undefined,
      appointment: String(formData.get("term_appointment") || "") || undefined,
      customer: String(formData.get("term_customer") || "") || undefined,
    };
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      name: String(formData.get("name") || ctx.tenant.name),
      timezone: String(formData.get("timezone") || ctx.tenant.timezone),
      theme,
    })
    .eq("id", ctx.tenant.id);
  if (error) throw error;

  revalidatePath("/admin/settings");
}
