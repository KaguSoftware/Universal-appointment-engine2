"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  type BookState,
  bookAppointment,
  fetchSlots,
} from "@/app/book/[slug]/actions";
import type { Service, Staff, Tenant } from "@/lib/types";

interface Props {
  tenant: Tenant;
  service: Service;
  staff: Staff[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialState: BookState = {};

export function SlotPicker({ tenant, service, staff }: Props) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, submit, submitting] = useActionState(
    bookAppointment,
    initialState,
  );

  useEffect(() => {
    if (!staffId) return;
    setSelected(null);
    startLoading(async () => {
      const result = await fetchSlots({
        serviceId: service.id,
        staffId,
        dateISO: date,
        timezone: tenant.timezone,
        tenantId: tenant.id,
      });
      setSlots(result);
    });
  }, [staffId, date, service.id, tenant.id, tenant.timezone]);

  function formatSlot(iso: string): string {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tenant.timezone,
    }).format(new Date(iso));
  }

  return (
    <div className="space-y-6">
      {staff.length > 1 && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Provider</span>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Date</span>
        <input
          type="date"
          value={date}
          min={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">Available times</span>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-500">No times available on this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={`rounded-md border px-2 py-2 text-sm ${
                  selected === iso
                    ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white"
                    : "hover:border-[var(--brand-accent)]"
                }`}
              >
                {formatSlot(iso)}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <form action={submit} className="space-y-3 border-t pt-4">
          <input type="hidden" name="slug" value={tenant.slug} />
          <input type="hidden" name="tenantId" value={tenant.id} />
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="staffId" value={staffId} />
          <input type="hidden" name="startISO" value={selected} />
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            className="w-full rounded-md border px-3 py-2 text-sm dark:bg-gray-900"
            rows={2}
          />
          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md px-4 py-2 font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand)" }}
          >
            {submitting ? "Booking…" : `Confirm ${formatSlot(selected)}`}
          </button>
        </form>
      )}
    </div>
  );
}
