"use server";

import { revalidatePath } from "next/cache";
import { CalendarSyncService } from "@/lib/integrations/google/calendar-sync-service";
import { AppointmentNotifier } from "@/lib/integrations/notifications/appointment-notifier";
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
  const id = String(formData.get("id"));

  if (status === "cancelled") {
    await new CalendarSyncService().removeForAppointment(id);
  }
  await new AppointmentRepository(supabase, ctx.tenant.id).setStatus(id, status);
  if (status === "cancelled") {
    await new AppointmentNotifier().notify(id, "cancellation");
  }
  revalidatePath("/admin/calendar");
}
