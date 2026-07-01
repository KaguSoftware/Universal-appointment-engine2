import Link from "next/link";
import { notFound } from "next/navigation";
import { ReschedulePicker } from "@/components/booking/reschedule-picker";
import { BookingRepository } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Appointment, Service } from "@/lib/types";

export default async function ReschedulePage({
  params,
}: {
  params: Promise<{ slug: string; appointmentId: string }>;
}) {
  const { slug, appointmentId } = await params;
  const supabase = await createSupabaseServerClient();

  const tenant = await new BookingRepository(supabase).getTenant(slug);
  if (!tenant) notFound();

  // RLS ensures only the owner customer or a tenant member can read this row.
  const { data } = await supabase
    .from("appointments")
    .select("*, services(name)")
    .eq("id", appointmentId)
    .maybeSingle<Appointment & { services: Pick<Service, "name"> }>();

  if (!data || data.status !== "booked") notFound();

  const current = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: tenant.timezone,
  }).format(new Date(data.start_at));

  return (
    <section className="space-y-6">
      <Link href="/my/appointments" className="text-sm underline">
        ← Back
      </Link>
      <div>
        <h2 className="text-lg font-semibold">Reschedule {data.services.name}</h2>
        <p className="text-sm text-gray-500">Currently: {current}</p>
      </div>

      <ReschedulePicker
        slug={slug}
        tenantId={tenant.id}
        timezone={tenant.timezone}
        appointmentId={data.id}
        serviceId={data.service_id}
        staffId={data.staff_id}
        currentStartISO={data.start_at}
      />
    </section>
  );
}
