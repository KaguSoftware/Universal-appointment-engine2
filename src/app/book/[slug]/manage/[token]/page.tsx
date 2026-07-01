import { notFound } from "next/navigation";
import { ManagePanel } from "@/components/booking/manage-panel";
import { BookingService } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const supabase = await createSupabaseServerClient();
  const appt = await new BookingService(supabase).getByToken(token);

  // Token must exist and belong to this tenant's booking page.
  if (!appt || appt.tenant_slug !== slug) notFound();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Manage your booking</h2>
        <p className="text-sm text-muted">{appt.tenant_name}</p>
      </div>
      <ManagePanel token={token} appt={appt} />
    </section>
  );
}
