import { createService, updateService } from "@/app/admin/services/actions";
import type { Service } from "@/lib/types";

/** Create/edit form for a service. Renders as a server-action <form>. */
export function ServiceForm({ service }: { service?: Service }) {
  const editing = Boolean(service);
  return (
    <form
      action={editing ? updateService : createService}
      className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-[color-mix(in_oklab,var(--surface)_50%,transparent)] p-4"
    >
      {editing && <input type="hidden" name="id" value={service!.id} />}
      <label className="col-span-2 space-y-1.5">
        <span className="label-text">Name</span>
        <input
          name="name"
          required
          defaultValue={service?.name}
          className="field"
        />
      </label>
      <NumberField name="duration_min" label="Duration (min)" value={service?.duration_min ?? 30} />
      <NumberField name="price" label="Price" value={service?.price ?? 0} step="0.01" />
      <NumberField name="buffer_before_min" label="Buffer before" value={service?.buffer_before_min ?? 0} />
      <NumberField name="buffer_after_min" label="Buffer after" value={service?.buffer_after_min ?? 0} />
      <label className="space-y-1.5">
        <span className="label-text">Deposit type</span>
        <select
          name="deposit_type"
          defaultValue={service?.deposit_type ?? "none"}
          className="field"
        >
          <option value="none">No deposit</option>
          <option value="fixed">Fixed amount</option>
          <option value="percent">Percent of price</option>
        </select>
      </label>
      <NumberField
        name="deposit_value"
        label="Deposit value"
        value={service?.deposit_value ?? 0}
        step="0.01"
      />
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="require_payment"
          defaultChecked={service?.require_payment ?? false}
        />
        Require full payment at booking
      </label>
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} />
        Active (bookable)
      </label>
      <button className="btn-primary col-span-2">
        {editing ? "Save changes" : "Add service"}
      </button>
    </form>
  );
}

function NumberField({
  name,
  label,
  value,
  step,
}: {
  name: string;
  label: string;
  value: number;
  step?: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="label-text">{label}</span>
      <input
        type="number"
        name={name}
        min={0}
        step={step ?? "1"}
        defaultValue={value}
        className="field"
      />
    </label>
  );
}
