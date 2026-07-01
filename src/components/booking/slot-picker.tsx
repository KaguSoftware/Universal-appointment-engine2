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
  /** When false, the form collects guest contact details. */
  isLoggedIn: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialState: BookState = {};

export function SlotPicker({ tenant, service, staff, isLoggedIn }: Props) {
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
    startLoading(async () => {
      const result = await fetchSlots({
        serviceId: service.id,
        staffId,
        dateISO: date,
        timezone: tenant.timezone,
        tenantId: tenant.id,
      });
      setSlots(result);
      setSelected(null);
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
        <label className="block space-y-1.5">
          <span className="label-text">Provider</span>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="field"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1.5">
        <span className="label-text">Date</span>
        <input
          type="date"
          value={date}
          min={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="field"
        />
      </label>

      <div className="space-y-2">
        <span className="label-text">Available times</span>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-[38px]" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">No times available on this day.</p>
        ) : (
          <div className="stagger grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={`rounded-[0.7rem] border px-2 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  selected === iso
                    ? "border-transparent bg-brand text-white shadow-[var(--shadow-ink)]"
                    : "border-[var(--glass-border)] bg-[var(--surface)] backdrop-blur hover:-translate-y-0.5 hover:bg-[var(--surface-strong)] hover:shadow-[var(--shadow-glass)]"
                }`}
              >
                {formatSlot(iso)}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <form action={submit} className="space-y-3 border-t border-border pt-5">
          <input type="hidden" name="slug" value={tenant.slug} />
          <input type="hidden" name="tenantId" value={tenant.id} />
          <input type="hidden" name="serviceId" value={service.id} />
          <input type="hidden" name="staffId" value={staffId} />
          <input type="hidden" name="startISO" value={selected} />
          {!isLoggedIn && (
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="label-text">Your name</span>
                <input
                  name="guest_name"
                  required
                  autoComplete="name"
                  className="field"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="label-text">Email</span>
                  <input
                    name="guest_email"
                    type="email"
                    autoComplete="email"
                    className="field"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="label-text">Phone</span>
                  <input
                    name="guest_phone"
                    type="tel"
                    autoComplete="tel"
                    className="field"
                  />
                </label>
              </div>
              <p className="text-xs text-muted">
                Enter an email or phone so we can send your confirmation and a
                link to manage this booking.
              </p>
            </div>
          )}
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            className="field text-sm"
            rows={2}
          />
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
            {submitting ? (
              <>
                <span className="spinner" />
                Booking…
              </>
            ) : (
              `Confirm ${formatSlot(selected)}`
            )}
          </button>
        </form>
      )}
    </div>
  );
}
