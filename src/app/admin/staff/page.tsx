import {
  createStaff,
  deleteStaff,
  disconnectGoogle,
  setStaffServices,
  updateStaff,
} from "@/app/admin/staff/actions";
import { AvailabilityEditor } from "@/components/admin/availability-editor";
import { OverridesEditor } from "@/components/admin/overrides-editor";
import { canAddStaff, tenantAllows } from "@/lib/feature-gate";
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
  const googleEnabled = tenantAllows(ctx.tenant, "google_calendar");

  // Resolve per-staff assignments + availability up front so the JSX is sync.
  const detailed = await Promise.all(
    staff.map(async (s) => ({
      staff: s,
      assigned: new Set(await repo.serviceIds(s.id)),
      rules: await repo.rules(s.id),
      overrides: await repo.overrides(s.id),
    })),
  );

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold">Staff</h1>

      {detailed.map(({ staff: s, assigned, rules, overrides }) => {
        return (
          <div key={s.id} className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.display_name}</span>
              <form action={deleteStaff}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm font-medium text-danger">Remove</button>
              </form>
            </div>

            <StaffFields staff={s} />
            <ServiceAssignment staff={s} services={services} assigned={assigned} />
            <GoogleConnect staff={s} enabled={googleEnabled} />
            <AvailabilityEditor staffId={s.id} rules={rules} />
            <OverridesEditor staffId={s.id} overrides={overrides} />
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
              className="field flex-1"
            />
            <input type="hidden" name="active" value="on" />
            <input type="hidden" name="color" value="#4f46e5" />
            <button className="btn-primary">Add</button>
          </form>
        ) : (
          <p className="rounded-xl border border-warning/30 bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] p-3 text-sm text-warning">
            Your Free plan allows one staff member.{" "}
            <a href="/admin/settings/billing" className="underline font-medium">
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
      <label className="space-y-1.5">
        <span className="label-text">Name</span>
        <input
          name="display_name"
          defaultValue={staff.display_name}
          className="field"
        />
      </label>
      <label className="space-y-1.5">
        <span className="label-text">Color</span>
        <input
          type="color"
          name="color"
          defaultValue={staff.color}
          className="block h-9 w-12 cursor-pointer rounded-lg border border-border-strong bg-transparent"
        />
      </label>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" name="active" defaultChecked={staff.active} />
        Active
      </label>
      <button className="btn-ghost">Save</button>
    </form>
  );
}

function GoogleConnect({ staff, enabled }: { staff: Staff; enabled: boolean }) {
  if (!enabled) {
    return (
      <p className="text-xs text-faint">
        Google Calendar sync is available on the Pro plan.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-medium">Google Calendar</span>
      {staff.google_calendar_connected ? (
        <>
          <span className="text-success">Connected</span>
          <form action={disconnectGoogle}>
            <input type="hidden" name="staffId" value={staff.id} />
            <button className="font-medium text-danger">Disconnect</button>
          </form>
        </>
      ) : (
        <a
          href={`/api/integrations/google/connect?staff=${staff.id}`}
          className="font-medium text-brand-accent"
        >
          Connect
        </a>
      )}
    </div>
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
      <p className="label-text">Services offered</p>
      <div className="flex flex-wrap gap-3">
        {services.map((svc) => (
          <label key={svc.id} className="flex items-center gap-1.5">
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
      <button className="btn-ghost">Save services</button>
    </form>
  );
}
