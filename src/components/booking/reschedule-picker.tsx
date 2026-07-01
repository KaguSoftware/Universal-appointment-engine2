"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  fetchRescheduleSlots,
  type RescheduleState,
  rescheduleAppointment,
} from "@/app/book/[slug]/reschedule/actions";

interface Props {
  slug: string;
  tenantId: string;
  timezone: string;
  appointmentId: string;
  serviceId: string;
  staffId: string;
  currentStartISO: string;
}

const initialState: RescheduleState = {};

export function ReschedulePicker(props: Props) {
  const [date, setDate] = useState(props.currentStartISO.slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, submit, submitting] = useActionState(
    rescheduleAppointment,
    initialState,
  );

  useEffect(() => {
    startLoading(async () => {
      const result = await fetchRescheduleSlots({
        appointmentId: props.appointmentId,
        serviceId: props.serviceId,
        staffId: props.staffId,
        dateISO: date,
        timezone: props.timezone,
        tenantId: props.tenantId,
      });
      setSlots(result);
      setSelected(null);
    });
  }, [
    date,
    props.appointmentId,
    props.serviceId,
    props.staffId,
    props.tenantId,
    props.timezone,
  ]);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: props.timezone,
    }).format(new Date(iso));

  return (
    <div className="space-y-6">
      <label className="block space-y-1">
        <span className="text-sm font-medium">New date</span>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border px-3 py-2 dark:bg-gray-900"
        />
      </label>

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
              {fmt(iso)}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <form action={submit} className="space-y-3 border-t pt-4">
          <input type="hidden" name="slug" value={props.slug} />
          <input type="hidden" name="appointmentId" value={props.appointmentId} />
          <input type="hidden" name="startISO" value={selected} />
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
            {submitting ? "Rescheduling…" : `Move to ${fmt(selected)}`}
          </button>
        </form>
      )}
    </div>
  );
}
