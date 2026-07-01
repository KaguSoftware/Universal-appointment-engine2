import { saveAvailability } from "@/app/admin/staff/actions";
import type { AvailabilityRule } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekly availability grid for one staff member (one row per weekday). */
export function AvailabilityEditor({
  staffId,
  rules,
}: {
  staffId: string;
  rules: AvailabilityRule[];
}) {
  const byDay = new Map(rules.map((r) => [r.weekday, r]));

  return (
    <form action={saveAvailability} className="space-y-2 rounded-xl border border-border bg-[color-mix(in_oklab,var(--surface)_50%,transparent)] p-4">
      <input type="hidden" name="staffId" value={staffId} />
      <p className="label-text">Weekly hours</p>
      {DAYS.map((label, weekday) => {
        const rule = byDay.get(weekday);
        return (
          <div key={weekday} className="flex items-center gap-2 text-sm">
            <label className="flex w-20 items-center gap-1">
              <input
                type="checkbox"
                name={`enabled_${weekday}`}
                defaultChecked={Boolean(rule)}
              />
              {label}
            </label>
            <input
              type="time"
              name={`start_${weekday}`}
              defaultValue={rule?.start_time.slice(0, 5) ?? "09:00"}
              className="field w-auto"
            />
            <span>–</span>
            <input
              type="time"
              name={`end_${weekday}`}
              defaultValue={rule?.end_time.slice(0, 5) ?? "17:00"}
              className="field w-auto"
            />
          </div>
        );
      })}
      <button className="btn-primary">Save hours</button>
    </form>
  );
}
