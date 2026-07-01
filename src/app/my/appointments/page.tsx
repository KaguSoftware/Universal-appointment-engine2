import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Appointment, Service, Tenant } from "@/lib/types";
import { cancelMyAppointment } from "./actions";

type Row = Appointment & {
  services: Pick<Service, "name">;
  tenants: Pick<Tenant, "name" | "slug">;
};

export default async function MyAppointmentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/my/appointments");

  const { data } = await supabase
    .from("appointments")
    .select("*, services(name), tenants(name, slug)")
    .eq("customer_id", user.id)
    .order("start_at", { ascending: true })
    .returns<Row[]>();

  const rows = data ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">My appointments</h1>
      {rows.length === 0 ? (
        <div className="glass p-10 text-center text-sm text-muted">
          You have no appointments yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li
              key={a.id}
              className="card flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium">
                  {a.services.name}{" "}
                  <span className="text-muted">· {a.tenants.name}</span>
                </p>
                <p className="text-sm text-muted">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(a.start_at))}
                </p>
                {a.status !== "booked" && (
                  <span className="badge mt-1">{a.status}</span>
                )}
              </div>
              {a.status === "booked" && (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/book/${a.tenants.slug}/reschedule/${a.id}`}
                    className="text-sm font-medium text-brand-accent"
                  >
                    Reschedule
                  </Link>
                  <form action={cancelMyAppointment}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-sm font-medium text-danger">
                      Cancel
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
