import Link from "next/link";
import { setAppointmentStatus } from "@/app/admin/calendar/actions";
import { WalkInForm } from "@/components/admin/walk-in-form";
import { WeekGrid } from "@/components/admin/week-grid";
import { AppointmentRepository } from "@/lib/repositories/appointment-repository";
import { StaffRepository } from "@/lib/repositories/staff-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Sunday that starts the week containing `dateISO`. */
function weekStart(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  return addDays(dateISO, -d.getUTCDay());
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  const repo = new AppointmentRepository(supabase, ctx.tenant.id);

  const { date, view } = await searchParams;
  const day = date ?? new Date().toISOString().slice(0, 10);
  const isWeek = view === "week";

  const rangeStart = isWeek ? weekStart(day) : day;
  const rangeEnd = isWeek ? addDays(rangeStart, 7) : addDays(day, 1);
  const appts = await repo.inRange(
    new Date(`${rangeStart}T00:00:00Z`).toISOString(),
    new Date(`${rangeEnd}T00:00:00Z`).toISOString(),
  );

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: ctx.tenant.timezone,
    }).format(new Date(iso));

  const step = isWeek ? 7 : 1;
  const base = isWeek ? rangeStart : day;
  const q = (d: string) => `?date=${d}${isWeek ? "&view=week" : ""}`;

  // Data for the walk-in booking form: services + staff with their service links.
  const staffRepo = new StaffRepository(supabase, ctx.tenant.id);
  const [services, staffList] = await Promise.all([
    staffRepo.servicesForAssignment(),
    staffRepo.list(),
  ]);
  const staffOptions = await Promise.all(
    staffList.map(async (s) => ({
      id: s.id,
      name: s.display_name,
      serviceIds: await staffRepo.serviceIds(s.id),
    })),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/admin/calendar?date=${day}${isWeek ? "" : "&view=week"}`}
            className="btn-ghost px-3 py-1"
          >
            {isWeek ? "Day view" : "Week view"}
          </Link>
          <Link href={`/admin/calendar${q(addDays(base, -step))}`} className="link-muted">
            ← Prev
          </Link>
          <span className="font-medium">{isWeek ? `Week of ${rangeStart}` : day}</span>
          <Link href={`/admin/calendar${q(addDays(base, step))}`} className="link-muted">
            Next →
          </Link>
        </div>
      </div>

      {services.length > 0 && staffOptions.length > 0 && (
        <WalkInForm
          services={services}
          staff={staffOptions}
          defaultDate={isWeek ? rangeStart : day}
        />
      )}

      {isWeek ? (
        <WeekGrid
          weekStartISO={rangeStart}
          appointments={appts}
          timeZone={ctx.tenant.timezone}
        />
      ) : appts.length === 0 ? (
        <div className="glass p-10 text-center text-sm text-muted">
          Nothing scheduled.
        </div>
      ) : (
        <ul className="space-y-2">
          {appts.map((a) => (
            <li key={a.id} className="card flex items-center gap-3 p-4">
              <span
                className="h-10 w-1.5 rounded-full"
                style={{ backgroundColor: a.staff.color }}
              />
              <div className="flex-1">
                <p className="font-medium">
                  {fmt(a.start_at)} – {fmt(a.end_at)} · {a.services.name}
                  {a.guest_name && (
                    <span className="text-muted"> · {a.guest_name}</span>
                  )}
                </p>
                <p className="text-sm text-muted">{a.staff.display_name}</p>
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
      <span className="badge">{status}</span>
      {status === "booked" &&
        options.map((o) => (
          <form action={setAppointmentStatus} key={o.value}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={o.value} />
            <button className="rounded-lg border border-border-strong px-2 py-1 text-xs font-medium transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
              {o.label}
            </button>
          </form>
        ))}
    </div>
  );
}
