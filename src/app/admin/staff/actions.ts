"use server";

import { revalidatePath } from "next/cache";
import { canAddStaff } from "@/lib/feature-gate";
import { StaffRepository } from "@/lib/repositories/staff-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

async function ctxRepo() {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  return { ctx, repo: new StaffRepository(supabase, ctx.tenant.id) };
}

function parse(formData: FormData) {
  return {
    display_name: String(formData.get("display_name") ?? "").trim(),
    bio: String(formData.get("bio") ?? "") || null,
    color: String(formData.get("color") ?? "#64748b"),
    active: formData.get("active") === "on",
  };
}

export async function createStaff(formData: FormData): Promise<void> {
  const { ctx, repo } = await ctxRepo();
  const active = await repo.activeCount();
  if (!canAddStaff(ctx.tenant.plan, active)) {
    throw new Error("Your plan's staff limit has been reached. Upgrade to Pro.");
  }
  await repo.create(parse(formData));
  revalidatePath("/admin/staff");
}

export async function updateStaff(formData: FormData): Promise<void> {
  const { repo } = await ctxRepo();
  await repo.update(String(formData.get("id")), parse(formData));
  revalidatePath("/admin/staff");
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const { repo } = await ctxRepo();
  await repo.remove(String(formData.get("id")));
  revalidatePath("/admin/staff");
}

export async function setStaffServices(formData: FormData): Promise<void> {
  const { repo } = await ctxRepo();
  const staffId = String(formData.get("staffId"));
  const ids = formData.getAll("serviceIds").map(String);
  await repo.setServices(staffId, ids);
  revalidatePath("/admin/staff");
}

export async function disconnectGoogle(formData: FormData): Promise<void> {
  await TenantContext.require();
  const { CalendarSyncService } = await import(
    "@/lib/integrations/google/calendar-sync-service"
  );
  await new CalendarSyncService().disconnect(String(formData.get("staffId")));
  revalidatePath("/admin/staff");
}

export async function saveAvailability(formData: FormData): Promise<void> {
  const { repo } = await ctxRepo();
  const staffId = String(formData.get("staffId"));
  const rules: { weekday: number; start_time: string; end_time: string }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (formData.get(`enabled_${weekday}`) !== "on") continue;
    const start = String(formData.get(`start_${weekday}`) || "");
    const end = String(formData.get(`end_${weekday}`) || "");
    if (start && end && end > start) {
      rules.push({ weekday, start_time: start, end_time: end });
    }
  }
  await repo.replaceRules(staffId, rules);
  revalidatePath("/admin/staff");
}
