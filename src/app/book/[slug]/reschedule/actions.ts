"use server";

import { redirect } from "next/navigation";
import { BookingService } from "@/lib/booking";
import { CalendarSyncService } from "@/lib/integrations/google/calendar-sync-service";
import { AppointmentNotifier } from "@/lib/integrations/notifications/appointment-notifier";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  SLOT_TAKEN: "That time was just taken. Please pick another slot.",
  NOT_RESCHEDULABLE: "This appointment can no longer be changed.",
  FORBIDDEN: "You can't change this appointment.",
};

export interface RescheduleState {
  error?: string;
}

/** Slots available for a reschedule, excluding the appointment's own time. */
export async function fetchRescheduleSlots(params: {
  appointmentId: string;
  serviceId: string;
  staffId: string;
  dateISO: string;
  timezone: string;
  tenantId: string;
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

export async function rescheduleAppointment(
  _prev: RescheduleState,
  formData: FormData,
): Promise<RescheduleState> {
  const supabase = await createSupabaseServerClient();
  const slug = String(formData.get("slug"));
  const appointmentId = String(formData.get("appointmentId"));
  const startISO = String(formData.get("startISO"));

  try {
    // Remove the old Google event, then move, then notify + re-sync.
    await new CalendarSyncService().removeForAppointment(appointmentId);
    const appt = await new BookingService(supabase).reschedule(
      appointmentId,
      startISO,
    );
    await new AppointmentNotifier().notify(appt.id, "confirmation");
    await new CalendarSyncService().pushForAppointment(appt.id);
    redirect(`/book/${slug}/confirmed?id=${appt.id}`);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const key = Object.keys(ERRORS).find((k) => code.includes(k));
    return { error: key ? ERRORS[key] : "Could not reschedule. Try again." };
  }
}
