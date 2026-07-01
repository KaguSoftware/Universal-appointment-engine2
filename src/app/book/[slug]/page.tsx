import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingRepository } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveTerminology } from "@/lib/verticals";

export default async function ServicePickerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const repo = new BookingRepository(supabase);

  const tenant = await repo.getTenant(slug);
  if (!tenant) notFound();
  const services = await repo.listServices(tenant.id);
  const terms = resolveTerminology(tenant);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Choose a {terms.service.toLowerCase()}</h2>
      {services.length === 0 && (
        <p className="text-sm text-muted">No services available yet.</p>
      )}
      <ul className="space-y-3">
        {services.map((s) => (
          <li key={s.id}>
            <Link
              href={`/book/${slug}/${s.id}`}
              className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-subtle"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted">{s.duration_min} min</p>
              </div>
              <span className="font-semibold">
                {s.price > 0 ? `${s.price} ${s.currency}` : "Free"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
