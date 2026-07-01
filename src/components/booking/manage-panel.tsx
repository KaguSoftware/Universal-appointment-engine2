"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  cancelByToken,
  fetchManageSlots,
  type ManageState,
  rescheduleByToken,
} from "@/app/book/[slug]/manage/[token]/actions";
import type { ManagedAppointment } from "@/lib/types";

const initialState: ManageState = {};

/** Account-less self-service: view, reschedule or cancel by token. */
export function ManagePanel({
  token,
  appt,
}: {
  token: string;
  appt: ManagedAppointment;
}) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [date, setDate] = useState(appt.start_at.slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const [cancelState, cancel, cancelling] = useActionState(
    cancelByToken,
    initialState,
  );
  const [rescheduleState, reschedule, rescheduling] = useActionState(
    rescheduleByToken,
    initialState,
  );

  useEffect(() => {
    if (mode !== "reschedule") return;
    startLoading(async () => {
      const result = await fetchManageSlots({
        token,
        serviceId: appt.service_id,
        staffId: appt.staff_id,
        tenantId: appt.tenant_id,
        appointmentId: appt.id,
        dateISO: date,
        timezone: appt.timezone,
      });
      setSlots(result);
      setSelected(null);
    });
  }, [
    mode,
    date,
    token,
    appt.service_id,
    appt.staff_id,
    appt.tenant_id,
    appt.id,
    appt.timezone,
  ]);

  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: appt.timezone,
    }).format(new Date(iso));

  const fmtFull = (iso: string) =>
    new Intl.DateTimeFormat("en", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: appt.timezone,
    }).format(new Date(iso));

  if (cancelState.cancelled || appt.status === "cancelled") {
    return (
      <div className="card p-6 text-center">
        <p className="font-medium">This booking is cancelled.</p>
        <p className="mt-1 text-sm text-muted">
          {appt.service_name} · {appt.staff_name}
        </p>
      </div>
    );
  }

  if (rescheduleState.rescheduledTo) {
    return (
      <div className="card p-6 text-center">
        <p className="font-medium">Booking updated.</p>
        <p className="mt-1 text-sm text-muted">
          Now on {fmtFull(rescheduleState.rescheduledTo)}.
        </p>
      </div>
    );
  }

  const changeable = appt.status === "booked";

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <p className="text-lg font-semibold">{appt.service_name}</p>
        <p className="mt-1 text-sm text-muted">
          {fmtFull(appt.start_at)} · {appt.staff_name}
        </p>
        <span className="badge mt-3">{appt.status}</span>
      </div>

      {!changeable ? (
        <p className="text-sm text-muted">
          This booking can no longer be changed.
        </p>
      ) : mode === "view" ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className="btn-ghost"
          >
            Reschedule
          </button>
          <form action={cancel}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" disabled={cancelling} className="btn-ghost">
              {cancelling ? "Cancelling…" : "Cancel booking"}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
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
            <p className="text-sm text-muted">
              No times available on this day.
            </p>
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
                  {fmtTime(iso)}
                </button>
              ))}
            </div>
          )}

          {(cancelState.error || rescheduleState.error) && (
            <p className="text-sm text-danger" role="alert">
              {cancelState.error ?? rescheduleState.error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("view")}
              className="btn-ghost"
            >
              Back
            </button>
            {selected && (
              <form action={reschedule}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="appointmentId" value={appt.id} />
                <input type="hidden" name="startISO" value={selected} />
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="btn-primary"
                >
                  {rescheduling ? "Saving…" : `Move to ${fmtTime(selected)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
