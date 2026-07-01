import Link from "next/link";
import { notFound } from "next/navigation";
import { SlotPicker } from "@/components/booking/slot-picker";
import { BookingRepository } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SlotPickerPage({
  params,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
}) {
  const { slug, serviceId } = await params;
  const supabase = await createSupabaseServerClient();
  const repo = new BookingRepository(supabase);

  const tenant = await repo.getTenant(slug);
  if (!tenant) notFound();

  const services = await repo.listServices(tenant.id);
  const service = services.find((s) => s.id === serviceId);
  if (!service) notFound();

  const staff = await repo.listStaffForService(serviceId);

  return (
    <section className="space-y-6">
      <Link href={`/book/${slug}`} className="link-muted text-sm">
        ← Back
      </Link>
      <div>
        <h2 className="text-lg font-semibold">{service.name}</h2>
        <p className="text-sm text-muted">{service.duration_min} min</p>
      </div>

      {staff.length === 0 ? (
        <p className="text-sm text-muted">
          No providers are available for this service yet.
        </p>
      ) : (
        <SlotPicker tenant={tenant} service={service} staff={staff} />
      )}
    </section>
  );
}
