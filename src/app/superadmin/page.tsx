import { setTenantPlan, toggleTenantStatus } from "@/app/superadmin/actions";
import { PlatformRepository } from "@/lib/superadmin/platform-repository";
import { requireSuperadmin } from "@/lib/superadmin/superadmin-guard";

export default async function SuperadminPage() {
  const { email } = await requireSuperadmin();
  const tenants = await new PlatformRepository().listTenants();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform admin</h1>
        <span className="text-sm text-gray-500">{email}</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2">Business</th>
            <th>Vertical</th>
            <th>Staff</th>
            <th>Plan</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id} className="border-b">
              <td className="py-2">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-gray-400">/{t.slug}</p>
              </td>
              <td>{t.vertical}</td>
              <td>{t.staff_count}</td>
              <td>
                <form action={setTenantPlan} className="flex items-center gap-1">
                  <input type="hidden" name="tenantId" value={t.id} />
                  <select
                    name="plan"
                    defaultValue={t.plan}
                    className="rounded border px-1 py-0.5 dark:bg-gray-900"
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                  </select>
                  <button className="rounded border px-2 py-0.5 text-xs">
                    Set
                  </button>
                </form>
              </td>
              <td>
                <form action={toggleTenantStatus}>
                  <input type="hidden" name="tenantId" value={t.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={t.status === "active" ? "suspended" : "active"}
                  />
                  <button
                    className={`rounded px-2 py-0.5 text-xs ${
                      t.status === "active"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {t.status} · toggle
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
