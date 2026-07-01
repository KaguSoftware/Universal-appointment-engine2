import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Appointment, Service } from "@/lib/types";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { slug } = await params;
  const { id } = await searchParams;
  if (!id) notFound();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("appointments")
    .select("*, services(name, duration_min)")
    .eq("id", id)
    .maybeSingle<Appointment & { services: Pick<Service, "name" | "duration_min"> }>();

  if (!data) notFound();

  const isGuest = !data.customer_id;
  const manageHref = `/book/${slug}/manage/${data.manage_token}`;

  const when = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(data.start_at));

  return (
    <section className="space-y-6 text-center">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white"
        style={{ backgroundColor: "var(--brand-accent)" }}
      >
        ✓
      </div>
      <div>
        <h2 className="text-2xl font-semibold">You&apos;re booked!</h2>
        <p className="mt-2 text-muted">
          {data.services.name} — {when}
        </p>
      </div>
      {isGuest && (
        <div className="card mx-auto max-w-sm p-4 text-left text-sm">
          <p className="label-text">Manage this booking</p>
          <p className="mt-1 text-muted">
            No account needed — use this link to reschedule or cancel. We&apos;ve
            also emailed it to you.
          </p>
          <Link href={manageHref} className="mt-2 inline-block font-medium">
            Open manage page →
          </Link>
        </div>
      )}

      <div className="flex justify-center gap-3">
        <Link href={`/book/${slug}`} className="btn-ghost">
          Book another
        </Link>
        {isGuest ? (
          <Link href={manageHref} className="btn-primary">
            Manage booking
          </Link>
        ) : (
          <Link href="/my/appointments" className="btn-primary">
            My appointments
          </Link>
        )}
      </div>
    </section>
  );
}
