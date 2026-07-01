"use server";

import { revalidatePath } from "next/cache";
import { PlatformRepository } from "@/lib/superadmin/platform-repository";
import { requireSuperadmin } from "@/lib/superadmin/superadmin-guard";
import type { PlanId } from "@/lib/types";

export async function setTenantPlan(formData: FormData): Promise<void> {
  await requireSuperadmin();
  await new PlatformRepository().setPlan(
    String(formData.get("tenantId")),
    String(formData.get("plan")) as PlanId,
  );
  revalidatePath("/superadmin");
}

export async function toggleTenantStatus(formData: FormData): Promise<void> {
  await requireSuperadmin();
  const status = String(formData.get("status")) as "active" | "suspended";
  await new PlatformRepository().setStatus(
    String(formData.get("tenantId")),
    status,
  );
  revalidatePath("/superadmin");
}
