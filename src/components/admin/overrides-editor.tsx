import { addOverride, removeOverride } from "@/app/admin/staff/actions";
import type { AvailabilityOverride } from "@/lib/types";

/** Manage one-off time off (block) and extra hours (extra) for a staff member. */
export function OverridesEditor({
  staffId,
  overrides,
}: {
  staffId: string;
  overrides: AvailabilityOverride[];
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-[color-mix(in_oklab,var(--surface)_50%,transparent)] p-4">
      <p className="label-text">Time off &amp; extra hours</p>

      {overrides.length > 0 && (
        <ul className="space-y-1 text-sm">
          {overrides.map((o) => (
            <li key={o.id} className="flex items-center justify-between">
              <span>
                {o.date} · {o.type === "block" ? "Off" : "Extra"}{" "}
                {o.start_time.slice(0, 5)}–{o.end_time.slice(0, 5)}
              </span>
              <form action={removeOverride}>
                <input type="hidden" name="id" value={o.id} />
                <button className="font-medium text-danger">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addOverride} className="flex flex-wrap items-end gap-2 text-sm">
        <input type="hidden" name="staffId" value={staffId} />
        <select name="type" className="field w-auto">
          <option value="block">Time off</option>
          <option value="extra">Extra hours</option>
        </select>
        <input type="date" name="date" required className="field w-auto" />
        <input
          type="time"
          name="start_time"
          defaultValue="09:00"
          className="field w-auto"
        />
        <span>–</span>
        <input
          type="time"
          name="end_time"
          defaultValue="17:00"
          className="field w-auto"
        />
        <button className="btn-ghost">Add</button>
      </form>
    </div>
  );
}
