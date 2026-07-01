import { deleteService } from "@/app/admin/services/actions";
import { ServiceForm } from "@/components/admin/service-form";
import { ServiceRepository } from "@/lib/repositories/service-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";
import type { Service } from "@/lib/types";

/** Short, human summary of a service's deposit policy for the list header. */
function depositSummary(s: Service): string {
  if (s.require_payment) return " · full payment upfront";
  if (s.deposit_type === "fixed" && s.deposit_value > 0) {
    return ` · ${s.deposit_value} deposit`;
  }
  if (s.deposit_type === "percent" && s.deposit_value > 0) {
    return ` · ${s.deposit_value}% deposit`;
  }
  return "";
}

export default async function ServicesPage() {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  const services = await new ServiceRepository(supabase, ctx.tenant.id).list();

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold">Services</h1>

      <ul className="space-y-4">
        {services.map((s) => (
          <li key={s.id} className="card animate-rise space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-medium">
                  {s.name}{" "}
                  {!s.active && <span className="badge">hidden</span>}
                </span>
                <p className="mt-0.5 text-sm text-muted">
                  {s.duration_min} min ·{" "}
                  {new Intl.NumberFormat("en", {
                    style: "currency",
                    currency: s.currency || "USD",
                  }).format(s.price)}
                  {depositSummary(s)}
                </p>
              </div>
              <form action={deleteService}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm font-medium text-danger">Delete</button>
              </form>
            </div>
            <ServiceForm service={s} />
          </li>
        ))}
      </ul>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Add a service</h2>
        <ServiceForm />
      </section>
    </div>
  );
}
