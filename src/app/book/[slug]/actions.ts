"use server";

import { redirect } from "next/navigation";
import { BookingService } from "@/lib/booking";
import { CalendarSyncService } from "@/lib/integrations/google/calendar-sync-service";
import { AppointmentNotifier } from "@/lib/integrations/notifications/appointment-notifier";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Appointment } from "@/lib/types";

async function syncToGoogle(appt: Appointment): Promise<void> {
  await new CalendarSyncService().pushForAppointment(appt.id);
}

const ERROR_MESSAGES: Record<string, string> = {
  SLOT_TAKEN: "That time was just booked. Please pick another slot.",
  AUTH_REQUIRED: "Please sign in to book.",
  SERVICE_NOT_FOUND: "This service is no longer available.",
  STAFF_SERVICE_MISMATCH: "This provider can't perform the selected service.",
};

export interface BookState {
  error?: string;
}

/** Returns available slot start-times (ISO) for a staff member on a date. */
export async function fetchSlots(params: {
  serviceId: string;
  staffId: string;
  dateISO: string;
  timezone: string;
  tenantId: string;
}): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const service = (await new BookingService(supabase).repository
    .listServices(params.tenantId)
    .then((list) => list.find((s) => s.id === params.serviceId))) ?? null;
  if (!service) return [];

  const slots = await new BookingService(supabase).slotsForDate(
    service,
    params.staffId,
    params.dateISO,
    params.timezone,
  );
  return slots.map((s) => s.start.toISOString());
}

export async function bookAppointment(
  _prev: BookState,
  formData: FormData,
): Promise<BookState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const slug = String(formData.get("slug"));
  const serviceId = String(formData.get("serviceId"));
  if (!user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/book/${slug}/${serviceId}`)}`,
    );
  }

  try {
    const appt = await new BookingService(supabase).book({
      tenantId: String(formData.get("tenantId")),
      serviceId,
      staffId: String(formData.get("staffId")),
      startISO: String(formData.get("startISO")),
      notes: String(formData.get("notes") || "") || undefined,
    });
    await new AppointmentNotifier().notify(appt.id, "confirmation");
    await syncToGoogle(appt);
    redirect(`/book/${slug}/confirmed?id=${appt.id}`);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    const key = Object.keys(ERROR_MESSAGES).find((k) => code.includes(k));
    return { error: key ? ERROR_MESSAGES[key] : "Booking failed. Try again." };
  }
}
