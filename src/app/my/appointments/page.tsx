import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Appointment, Service, Tenant } from "@/lib/types";
import { cancelMyAppointment } from "./actions";

type Row = Appointment & {
  services: Pick<Service, "name">;
  tenants: Pick<Tenant, "name">;
};

export default async function MyAppointmentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/my/appointments");

  const { data } = await supabase
    .from("appointments")
    .select("*, services(name), tenants(name)")
    .eq("customer_id", user.id)
    .order("start_at", { ascending: true })
    .returns<Row[]>();

  const rows = data ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">My appointments</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">You have no appointments yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">
                  {a.services.name}{" "}
                  <span className="text-gray-500">· {a.tenants.name}</span>
                </p>
                <p className="text-sm text-gray-500">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(a.start_at))}
                </p>
                {a.status !== "booked" && (
                  <span className="text-xs uppercase text-gray-400">
                    {a.status}
                  </span>
                )}
              </div>
              {a.status === "booked" && (
                <form action={cancelMyAppointment}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-sm text-red-600 underline">
                    Cancel
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
