import Link from "next/link";
import { CustomerRepository } from "@/lib/repositories/customer-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  const { q } = await searchParams;
  const customers = await new CustomerRepository(
    supabase,
    ctx.tenant.id,
  ).list(q);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold">Customers</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email or phone"
          className="field flex-1"
        />
        <button className="btn-ghost px-4">Search</button>
      </form>

      {customers.length === 0 ? (
        <div className="glass p-10 text-center text-sm text-muted">
          {q ? "No customers match that search." : "No customers yet."}
        </div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/customers/${c.id}`}
                className="card animate-rise flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-muted">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  {c.total_no_shows > 0 && (
                    <span className="badge">{c.total_no_shows} no-shows</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
