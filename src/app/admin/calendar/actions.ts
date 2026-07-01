"use server";

import { revalidatePath } from "next/cache";
import { AppointmentRepository } from "@/lib/repositories/appointment-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";
import type { AppointmentStatus } from "@/lib/types";

const ALLOWED: AppointmentStatus[] = [
  "booked",
  "completed",
  "no_show",
  "cancelled",
];

export async function setAppointmentStatus(formData: FormData): Promise<void> {
  const status = String(formData.get("status")) as AppointmentStatus;
  if (!ALLOWED.includes(status)) throw new Error("Invalid status");

  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  await new AppointmentRepository(supabase, ctx.tenant.id).setStatus(
    String(formData.get("id")),
    status,
  );
  revalidatePath("/admin/calendar");
}
