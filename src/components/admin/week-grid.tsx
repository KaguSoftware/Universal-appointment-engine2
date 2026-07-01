import type { AppointmentWithRefs } from "@/lib/repositories/appointment-repository";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A 7-column week grid grouping appointments by day (tenant-timezone aware). */
export function WeekGrid({
  weekStartISO,
  appointments,
  timeZone,
}: {
  weekStartISO: string; // yyyy-MM-dd (Sunday)
  appointments: AppointmentWithRefs[];
  timeZone: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStartISO}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const dayKey = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" })
      .format(new Date(iso))
      .replaceAll("/", "-");

  const byDay = new Map<string, AppointmentWithRefs[]>();
  for (const a of appointments) {
    const key = dayKey(a.start_at);
    const list = byDay.get(key) ?? [];
    list.push(a);
    byDay.set(key, list);
  }

  const time = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(iso));

  return (
    <div className="grid grid-cols-7 gap-2 text-xs">
      {days.map((iso, i) => {
        const key = dayKey(`${iso}T12:00:00Z`);
        const items = byDay.get(key) ?? [];
        return (
          <div key={iso} className="card min-h-32 p-2">
            <p className="mb-2 font-medium text-muted">
              {DAY_LABELS[i]} {iso.slice(8)}
            </p>
            <ul className="space-y-1">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border-l-2 bg-subtle p-1.5"
                  style={{ borderLeftColor: a.staff.color }}
                >
                  <span className="block font-medium">{time(a.start_at)}</span>
                  <span className="block truncate">{a.services.name}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
