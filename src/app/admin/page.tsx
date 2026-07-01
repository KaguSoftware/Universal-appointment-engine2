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
      <h1 className="text-2xl font-bold">Today</h1>
      {today.length === 0 ? (
        <p className="text-sm text-gray-500">
          No {terms.appointment.toLowerCase()}s scheduled today.
        </p>
      ) : (
        <ul className="space-y-2">
          {today.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <span
                className="h-8 w-1 rounded"
                style={{ backgroundColor: a.staff.color }}
              />
              <div className="flex-1">
                <p className="font-medium">{a.services.name}</p>
                <p className="text-sm text-gray-500">
                  {new Intl.DateTimeFormat("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: ctx.tenant.timezone,
                  }).format(new Date(a.start_at))}{" "}
                  · {a.staff.display_name}
                </p>
              </div>
              <span className="text-xs uppercase text-gray-400">{a.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
