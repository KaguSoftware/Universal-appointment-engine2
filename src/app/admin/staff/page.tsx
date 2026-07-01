import {
  createStaff,
  deleteStaff,
  setStaffServices,
  updateStaff,
} from "@/app/admin/staff/actions";
import { AvailabilityEditor } from "@/components/admin/availability-editor";
import { canAddStaff } from "@/lib/feature-gate";
import { StaffRepository } from "@/lib/repositories/staff-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";
import type { Service, Staff } from "@/lib/types";

export default async function StaffPage() {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  const repo = new StaffRepository(supabase, ctx.tenant.id);

  const [staff, services, activeCount] = await Promise.all([
    repo.list(),
    repo.servicesForAssignment(),
    repo.activeCount(),
  ]);
  const canAdd = canAddStaff(ctx.tenant.plan, activeCount);

  // Resolve per-staff assignments + availability up front so the JSX is sync.
  const detailed = await Promise.all(
    staff.map(async (s) => ({
      staff: s,
      assigned: new Set(await repo.serviceIds(s.id)),
      rules: await repo.rules(s.id),
    })),
  );

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Staff</h1>

      {detailed.map(({ staff: s, assigned, rules }) => {
        return (
          <div key={s.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.display_name}</span>
              <form action={deleteStaff}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm text-red-600 underline">Remove</button>
              </form>
            </div>

            <StaffFields staff={s} />
            <ServiceAssignment staff={s} services={services} assigned={assigned} />
            <AvailabilityEditor staffId={s.id} rules={rules} />
          </div>
        );
      })}

      <section className="space-y-2">
        <h2 className="font-semibold">Add staff</h2>
        {canAdd ? (
          <form action={createStaff} className="flex gap-2">
            <input
              name="display_name"
              required
              placeholder="Name"
              className="flex-1 rounded border px-2 py-1.5 dark:bg-gray-900"
            />
            <input type="hidden" name="active" value="on" />
            <input type="hidden" name="color" value="#4f46e5" />
            <button className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-gray-900">
              Add
            </button>
          </form>
        ) : (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Your Free plan allows one staff member.{" "}
            <a href="/admin/settings/billing" className="underline">
              Upgrade to Pro
            </a>{" "}
            to add more.
          </p>
        )}
      </section>
    </div>
  );
}

function StaffFields({ staff }: { staff: Staff }) {
  return (
    <form action={updateStaff} className="flex items-end gap-2 text-sm">
      <input type="hidden" name="id" value={staff.id} />
      <label className="space-y-1">
        <span className="font-medium">Name</span>
        <input
          name="display_name"
          defaultValue={staff.display_name}
          className="block rounded border px-2 py-1 dark:bg-gray-900"
        />
      </label>
      <label className="space-y-1">
        <span className="font-medium">Color</span>
        <input type="color" name="color" defaultValue={staff.color} />
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" name="active" defaultChecked={staff.active} />
        Active
      </label>
      <button className="rounded border px-3 py-1">Save</button>
    </form>
  );
}

function ServiceAssignment({
  staff,
  services,
  assigned,
}: {
  staff: Staff;
  services: Pick<Service, "id" | "name">[];
  assigned: Set<string>;
}) {
  return (
    <form action={setStaffServices} className="space-y-2 text-sm">
      <input type="hidden" name="staffId" value={staff.id} />
      <p className="font-medium">Services offered</p>
      <div className="flex flex-wrap gap-2">
        {services.map((svc) => (
          <label key={svc.id} className="flex items-center gap-1">
            <input
              type="checkbox"
              name="serviceIds"
              value={svc.id}
              defaultChecked={assigned.has(svc.id)}
            />
            {svc.name}
          </label>
        ))}
      </div>
      <button className="rounded border px-3 py-1">Save services</button>
    </form>
  );
}
