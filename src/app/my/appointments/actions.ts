"use server";

import { revalidatePath } from "next/cache";
import { BookingService } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function cancelMyAppointment(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await new BookingService(supabase).cancel(String(formData.get("id")));
  revalidatePath("/my/appointments");
}
