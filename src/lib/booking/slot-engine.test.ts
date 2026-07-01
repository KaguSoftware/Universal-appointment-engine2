import { describe, expect, it } from "vitest";
import type {
  Appointment,
  AvailabilityOverride,
  AvailabilityRule,
} from "@/lib/types";
import { SlotEngine, type SlotEngineInput } from "./slot-engine";

const UTC = "UTC";

function rule(weekday: number, start: string, end: string): AvailabilityRule {
  return {
    id: crypto.randomUUID(),
    tenant_id: "t",
    staff_id: "s",
    weekday,
    start_time: start,
    end_time: end,
  };
}

function override(
  date: string,
  type: "block" | "extra",
  start: string,
  end: string,
): AvailabilityOverride {
  return {
    id: crypto.randomUUID(),
    tenant_id: "t",
    staff_id: "s",
    date,
    type,
    start_time: start,
    end_time: end,
  };
}

function appt(startISO: string, endISO: string): Appointment {
  return {
    id: crypto.randomUUID(),
    tenant_id: "t",
    service_id: "svc",
    staff_id: "s",
    customer_id: "c",
    start_at: startISO,
    end_at: endISO,
    status: "booked",
    notes: null,
    google_event_id: null,
    created_at: startISO,
  };
}

function baseInput(overrides: Partial<SlotEngineInput> = {}): SlotEngineInput {
  // 2025-06-16 is a Monday (weekday 1).
  return {
    dateISO: "2025-06-16",
    timeZone: UTC,
    rules: [rule(1, "09:00", "12:00")],
    overrides: [],
    appointments: [],
    service: { duration_min: 30, buffer_before_min: 0, buffer_after_min: 0 },
    granularityMin: 30,
    ...overrides,
  };
}

describe("SlotEngine", () => {
  it("slices a working window into duration-sized slots", () => {
    const slots = new SlotEngine(baseInput()).generate();
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2025-06-16T09:00:00.000Z",
      "2025-06-16T09:30:00.000Z",
      "2025-06-16T10:00:00.000Z",
      "2025-06-16T10:30:00.000Z",
      "2025-06-16T11:00:00.000Z",
      "2025-06-16T11:30:00.000Z",
    ]);
  });

  it("returns nothing when there is no rule for that weekday", () => {
    const slots = new SlotEngine(
      baseInput({ rules: [rule(2, "09:00", "12:00")] }),
    ).generate();
    expect(slots).toHaveLength(0);
  });

  it("removes slots overlapping an existing appointment", () => {
    const slots = new SlotEngine(
      baseInput({
        appointments: [
          appt("2025-06-16T10:00:00.000Z", "2025-06-16T10:30:00.000Z"),
        ],
      }),
    ).generate();
    const starts = slots.map((s) => s.start.toISOString());
    expect(starts).not.toContain("2025-06-16T10:00:00.000Z");
    // The 09:30 slot (ends 10:00) is still valid; 10:00 is gone.
    expect(starts).toContain("2025-06-16T09:30:00.000Z");
    expect(starts).toContain("2025-06-16T10:30:00.000Z");
  });

  it("applies buffers around existing appointments", () => {
    const slots = new SlotEngine(
      baseInput({
        service: { duration_min: 30, buffer_before_min: 15, buffer_after_min: 15 },
        appointments: [
          appt("2025-06-16T10:00:00.000Z", "2025-06-16T10:30:00.000Z"),
        ],
      }),
    ).generate();
    const starts = slots.map((s) => s.start.toISOString());
    // Busy window becomes 09:45–10:45; the 09:30 slot (ends 10:00) overlaps it.
    expect(starts).not.toContain("2025-06-16T09:30:00.000Z");
    expect(starts).toContain("2025-06-16T09:00:00.000Z");
  });

  it("subtracts block overrides from availability", () => {
    const slots = new SlotEngine(
      baseInput({
        overrides: [override("2025-06-16", "block", "10:00", "11:00")],
      }),
    ).generate();
    const starts = slots.map((s) => s.start.toISOString());
    expect(starts).not.toContain("2025-06-16T10:00:00.000Z");
    expect(starts).not.toContain("2025-06-16T10:30:00.000Z");
    expect(starts).toContain("2025-06-16T11:00:00.000Z");
  });

  it("adds extra-availability overrides", () => {
    const slots = new SlotEngine(
      baseInput({
        rules: [],
        overrides: [override("2025-06-16", "extra", "14:00", "15:00")],
      }),
    ).generate();
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2025-06-16T14:00:00.000Z",
      "2025-06-16T14:30:00.000Z",
    ]);
  });

  it("filters slots before `notBefore`", () => {
    const slots = new SlotEngine(
      baseInput({ notBefore: new Date("2025-06-16T10:15:00.000Z") }),
    ).generate();
    expect(slots[0].start.toISOString()).toBe("2025-06-16T10:30:00.000Z");
  });

  it("respects a non-UTC timezone (Istanbul, UTC+3)", () => {
    const slots = new SlotEngine(
      baseInput({ timeZone: "Europe/Istanbul" }),
    ).generate();
    // 09:00 Istanbul == 06:00 UTC.
    expect(slots[0].start.toISOString()).toBe("2025-06-16T06:00:00.000Z");
  });

  it("does not emit a partial slot that exceeds the window", () => {
    const slots = new SlotEngine(
      baseInput({
        rules: [rule(1, "09:00", "09:45")],
        service: { duration_min: 30, buffer_before_min: 0, buffer_after_min: 0 },
        granularityMin: 30,
      }),
    ).generate();
    // 09:00 fits (ends 09:30); 09:30 would end 10:00 > 09:45, so excluded.
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      "2025-06-16T09:00:00.000Z",
    ]);
  });
});
