import { AppointmentRepository } from "@/lib/repositories/appointment-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";
import { resolveTerminology } from "@/lib/verticals";

export default async function AdminDashboard() {
  const ctx = await TenantContext.require();
  const terms = resolveTerminology(ctx.tenant);
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const today = await new AppointmentRepository(
    supabase,
    ctx.tenant.id,
  ).inRange(startOfDay.toISOString(), endOfDay.toISOString());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Today</h1>
        <p className="mt-1 text-sm text-muted">
          {today.length} {terms.appointment.toLowerCase()}
          {today.length === 1 ? "" : "s"} scheduled.
        </p>
      </div>
      {today.length === 0 ? (
        <div className="glass p-10 text-center text-sm text-muted">
          No {terms.appointment.toLowerCase()}s scheduled today.
        </div>
      ) : (
        <ul className="space-y-2">
          {today.map((a) => (
            <li
              key={a.id}
              className="card flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
            >
              <span
                className="h-9 w-1.5 rounded-full"
                style={{ backgroundColor: a.staff.color }}
              />
              <div className="flex-1">
                <p className="font-medium">{a.services.name}</p>
                <p className="text-sm text-muted">
                  {new Intl.DateTimeFormat("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: ctx.tenant.timezone,
                  }).format(new Date(a.start_at))}{" "}
                  · {a.staff.display_name}
                </p>
              </div>
              <span className="badge">{a.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
