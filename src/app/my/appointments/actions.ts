"use server";

import { revalidatePath } from "next/cache";
import { BookingService } from "@/lib/booking";
import { AppointmentNotifier } from "@/lib/integrations/notifications/appointment-notifier";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function cancelMyAppointment(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));
  await new BookingService(supabase).cancel(id);
  await new AppointmentNotifier().notify(id, "cancellation");
  revalidatePath("/my/appointments");
}
