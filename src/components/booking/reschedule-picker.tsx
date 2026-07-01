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
      <label className="block space-y-1.5">
        <span className="label-text">New date</span>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="field"
        />
      </label>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted">No times available on this day.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((iso) => (
            <button
              key={iso}
              type="button"
              onClick={() => setSelected(iso)}
              className={`rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
                selected === iso
                  ? "border-brand bg-brand text-white"
                  : "border-border-strong hover:bg-subtle"
              }`}
            >
              {fmt(iso)}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <form action={submit} className="space-y-3 border-t border-border pt-5">
          <input type="hidden" name="slug" value={props.slug} />
          <input type="hidden" name="appointmentId" value={props.appointmentId} />
          <input type="hidden" name="startISO" value={selected} />
          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-accent w-full"
          >
            {submitting ? "Rescheduling…" : `Move to ${fmt(selected)}`}
          </button>
        </form>
      )}
    </div>
  );
}
