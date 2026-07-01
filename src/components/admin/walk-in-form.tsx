"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createWalkIn,
  type WalkInState,
} from "@/app/admin/calendar/actions";

interface StaffOption {
  id: string;
  name: string;
  serviceIds: string[];
}

interface Props {
  services: { id: string; name: string }[];
  staff: StaffOption[];
  defaultDate: string;
}

const initialState: WalkInState = {};

/** Collapsible admin form to add a walk-in / phone booking to the calendar. */
export function WalkInForm({ services, staff, defaultDate }: Props) {
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [state, action, pending] = useActionState(createWalkIn, initialState);

  // Only staff assigned to the chosen service can take it.
  const eligibleStaff = useMemo(
    () => staff.filter((s) => s.serviceIds.includes(serviceId)),
    [staff, serviceId],
  );

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Add booking
      </button>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <p className="font-medium">New booking</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="link-muted text-sm"
        >
          Close
        </button>
      </div>

      {state.ok && (
        <p className="text-sm text-success">
          Booking added. Add another or close.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="label-text">Service</span>
          <select
            name="serviceId"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="field"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="label-text">Provider</span>
          <select name="staffId" className="field" required>
            {eligibleStaff.length === 0 ? (
              <option value="">No provider offers this service</option>
            ) : (
              eligibleStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="label-text">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={defaultDate}
            className="field"
            required
          />
        </label>

        <label className="space-y-1.5">
          <span className="label-text">Time</span>
          <input type="time" name="time" className="field" required />
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="label-text">Customer name</span>
          <input name="guest_name" className="field" required />
        </label>

        <label className="space-y-1.5">
          <span className="label-text">Email</span>
          <input name="guest_email" type="email" className="field" />
        </label>

        <label className="space-y-1.5">
          <span className="label-text">Phone</span>
          <input name="guest_phone" type="tel" className="field" />
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <span className="label-text">Notes</span>
          <input name="notes" className="field" />
        </label>
      </div>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || eligibleStaff.length === 0}
        className="btn-primary"
      >
        {pending ? "Adding…" : "Add booking"}
      </button>
    </form>
  );
}
