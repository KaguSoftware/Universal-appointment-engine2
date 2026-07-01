"use server";

import { BookingService } from "@/lib/booking";
import { CalendarSyncService } from "@/lib/integrations/google/calendar-sync-service";
import { AppointmentNotifier } from "@/lib/integrations/notifications/appointment-notifier";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  SLOT_TAKEN: "That time was just taken. Please pick another slot.",
  NOT_RESCHEDULABLE: "This booking can no longer be changed.",
  NOT_CANCELLABLE: "This booking can no longer be cancelled.",
  NOT_FOUND: "We couldn't find this booking.",
};

export interface ManageState {
  error?: string;
  cancelled?: boolean;
  rescheduledTo?: string;
}

/** Available slots for a token-managed reschedule (excludes its own time). */
export async function fetchManageSlots(params: {
  token: string;
  serviceId: string;
  staffId: string;
  tenantId: string;
  appointmentId: string;
  dateISO: string;
  timezone: string;
}): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const service = await new BookingService(supabase).repository
    .listServices(params.tenantId)
    .then((list) => list.find((s) => s.id === params.serviceId));
  if (!service) return [];

  const slots = await new BookingService(supabase).slotsForDate(
    service,
    params.staffId,
    params.dateISO,
    params.timezone,
    params.appointmentId,
  );
  return slots.map((s) => s.start.toISOString());
}

export async function cancelByToken(
  _prev: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const supabase = await createSupabaseServerClient();
  const token = String(formData.get("token"));
  try {
    const appt = await new BookingService(supabase).cancelByToken(token);
    await new CalendarSyncService().removeForAppointment(appt.id);
    await new AppointmentNotifier().notify(appt.id, "cancellation");
    return { cancelled: true };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const key = Object.keys(ERRORS).find((k) => code.includes(k));
    return { error: key ? ERRORS[key] : "Could not cancel. Try again." };
  }
}

export async function rescheduleByToken(
  _prev: ManageState,
  formData: FormData,
): Promise<ManageState> {
  const supabase = await createSupabaseServerClient();
  const token = String(formData.get("token"));
  const startISO = String(formData.get("startISO"));
  try {
    await new CalendarSyncService().removeForAppointment(
      String(formData.get("appointmentId")),
    );
    const appt = await new BookingService(supabase).rescheduleByToken(
      token,
      startISO,
    );
    await new AppointmentNotifier().notify(appt.id, "confirmation");
    await new CalendarSyncService().pushForAppointment(appt.id);
    return { rescheduledTo: appt.start_at };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const key = Object.keys(ERRORS).find((k) => code.includes(k));
    return { error: key ? ERRORS[key] : "Could not reschedule. Try again." };
  }
}
