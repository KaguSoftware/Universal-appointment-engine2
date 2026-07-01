import Link from "next/link";
import { setAppointmentStatus } from "@/app/admin/calendar/actions";
import { AppointmentRepository } from "@/lib/repositories/appointment-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();

  const { date } = await searchParams;
  const day = date ?? new Date().toISOString().slice(0, 10);
  const fromISO = new Date(`${day}T00:00:00Z`).toISOString();
  const toISO = new Date(`${addDays(day, 1)}T00:00:00Z`).toISOString();

  const appts = await new AppointmentRepository(supabase, ctx.tenant.id).inRange(
    fromISO,
    toISO,
  );

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: ctx.tenant.timezone,
    }).format(new Date(iso));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/admin/calendar?date=${addDays(day, -1)}`} className="underline">
            ← Prev
          </Link>
          <span className="font-medium">{day}</span>
          <Link href={`/admin/calendar?date=${addDays(day, 1)}`} className="underline">
            Next →
          </Link>
        </div>
      </div>

      {appts.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing scheduled.</p>
      ) : (
        <ul className="space-y-2">
          {appts.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <span
                className="h-10 w-1 rounded"
                style={{ backgroundColor: a.staff.color }}
              />
              <div className="flex-1">
                <p className="font-medium">
                  {fmt(a.start_at)} – {fmt(a.end_at)} · {a.services.name}
                </p>
                <p className="text-sm text-gray-500">{a.staff.display_name}</p>
              </div>
              <StatusControl id={a.id} status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusControl({ id, status }: { id: string; status: string }) {
  const options = [
    { value: "completed", label: "Done" },
    { value: "no_show", label: "No-show" },
    { value: "cancelled", label: "Cancel" },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase text-gray-400">{status}</span>
      {status === "booked" &&
        options.map((o) => (
          <form action={setAppointmentStatus} key={o.value}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={o.value} />
            <button className="rounded border px-2 py-0.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800">
              {o.label}
            </button>
          </form>
        ))}
    </div>
  );
}
