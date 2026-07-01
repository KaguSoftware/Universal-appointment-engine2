"use server";

import { revalidatePath } from "next/cache";
import { BookingService } from "@/lib/booking";
import { zonedDateTime } from "@/lib/booking/time";
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

export interface WalkInState {
  error?: string;
  ok?: boolean;
}

/**
 * Admin/staff walk-in (or phone) booking, created on behalf of a guest
 * customer. Date + time are entered in the tenant's timezone.
 */
export async function createWalkIn(
  _prev: WalkInState,
  formData: FormData,
): Promise<WalkInState> {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();

  const guestName = String(formData.get("guest_name") || "").trim();
  if (!guestName) return { error: "Customer name is required." };

  const dateISO = String(formData.get("date"));
  const time = String(formData.get("time"));
  if (!dateISO || !time) return { error: "Pick a date and time." };

  const startISO = zonedDateTime(dateISO, time, ctx.tenant.timezone).toISOString();

  try {
    const appt = await new BookingService(supabase).bookAsAdmin({
      tenantId: ctx.tenant.id,
      serviceId: String(formData.get("serviceId")),
      staffId: String(formData.get("staffId")),
      startISO,
      guestName,
      guestEmail: String(formData.get("guest_email") || "").trim() || undefined,
      guestPhone: String(formData.get("guest_phone") || "").trim() || undefined,
      notes: String(formData.get("notes") || "").trim() || undefined,
    });
    await new AppointmentNotifier().notify(appt.id, "confirmation");
    await new CalendarSyncService().pushForAppointment(appt.id);
    revalidatePath("/admin/calendar");
    return { ok: true };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code.includes("SLOT_TAKEN")) {
      return { error: "That slot overlaps an existing appointment." };
    }
    if (code.includes("STAFF_SERVICE_MISMATCH")) {
      return { error: "That provider can't perform the selected service." };
    }
    return { error: "Could not create the booking. Check the details." };
  }
}
