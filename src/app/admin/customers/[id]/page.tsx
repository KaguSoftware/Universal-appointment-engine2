import Link from "next/link";
import { notFound } from "next/navigation";
import { updateCustomer } from "@/app/admin/customers/actions";
import { CustomerRepository } from "@/lib/repositories/customer-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  const repo = new CustomerRepository(supabase, ctx.tenant.id);

  const [customer, history] = await Promise.all([
    repo.get(id),
    repo.history(id),
  ]);
  if (!customer) notFound();

  const money = (n: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(n);
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: ctx.tenant.timezone,
    }).format(new Date(iso));

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/customers" className="link-muted text-sm">
        ← All customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{customer.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[customer.email, customer.phone].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex gap-2 text-center text-sm">
          <div className="card px-4 py-2">
            <p className="text-xs text-muted">Spend</p>
            <p className="font-semibold">{money(customer.total_spend)}</p>
          </div>
          <div className="card px-4 py-2">
            <p className="text-xs text-muted">No-shows</p>
            <p className="font-semibold">{customer.total_no_shows}</p>
          </div>
          <div className="card px-4 py-2">
            <p className="text-xs text-muted">Visits</p>
            <p className="font-semibold">{history.length}</p>
          </div>
        </div>
      </div>

      <form
        action={updateCustomer}
        className="card grid gap-3 p-4"
      >
        <input type="hidden" name="id" value={customer.id} />
        <label className="space-y-1.5">
          <span className="label-text">Tags (comma separated)</span>
          <input
            name="tags"
            defaultValue={customer.tags.join(", ")}
            className="field"
          />
        </label>
        <label className="space-y-1.5">
          <span className="label-text">Notes</span>
          <textarea
            name="notes"
            defaultValue={customer.notes ?? ""}
            rows={3}
            className="field"
          />
        </label>
        <button className="btn-primary justify-self-start">Save</button>
      </form>

      <div>
        <h2 className="mb-3 font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">No appointments yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((a) => (
              <li key={a.id} className="card flex items-center justify-between p-3 text-sm">
                <span>
                  {fmt(a.start_at)} · {a.services.name}
                  <span className="text-muted"> · {a.staff.display_name}</span>
                </span>
                <span className="badge">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
