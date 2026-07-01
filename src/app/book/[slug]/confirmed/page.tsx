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

  const when = new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(data.start_at));

  return (
    <section className="space-y-6 text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
        style={{ backgroundColor: "var(--brand-accent)" }}
      >
        ✓
      </div>
      <div>
        <h2 className="text-xl font-semibold">You&apos;re booked!</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {data.services.name} — {when}
        </p>
      </div>
      <div className="flex justify-center gap-4">
        <Link href={`/book/${slug}`} className="underline">
          Book another
        </Link>
        <Link href="/my/appointments" className="underline">
          My appointments
        </Link>
      </div>
    </section>
  );
}
