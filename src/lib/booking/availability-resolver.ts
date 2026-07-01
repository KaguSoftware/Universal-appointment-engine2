import type {
  Appointment,
  AvailabilityOverride,
  AvailabilityRule,
} from "@/lib/types";
import {
  type Interval,
  minutesToMs,
  subtractIntervals,
  weekdayInZone,
  zonedDateTime,
} from "./time";

export interface ResolverInput {
  dateISO: string; // "yyyy-MM-dd" in tenant zone
  timeZone: string;
  rules: AvailabilityRule[]; // this staff's weekly rules
  overrides: AvailabilityOverride[]; // this staff's overrides for the date
  appointments: Appointment[]; // this staff's non-cancelled appts touching the date
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

/**
 * Computes the free (bookable) intervals for one staff member on one date,
 * accounting for weekly hours, one-off overrides, existing appointments and
 * per-service buffers. All output intervals are absolute UTC instants.
 */
export class AvailabilityResolver {
  constructor(private readonly input: ResolverInput) {}

  resolve(): Interval[] {
    const working = this.workingIntervals();
    if (working.length === 0) return [];

    const busy = this.busyIntervals();
    return working
      .flatMap((w) => subtractIntervals(w, busy))
      .filter((i) => i.end > i.start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /** Base working windows: weekly rules for this weekday, plus `extra` overrides. */
  private workingIntervals(): Interval[] {
    const { dateISO, timeZone, rules, overrides } = this.input;
    const weekday = weekdayInZone(dateISO, timeZone);

    const fromRules = rules
      .filter((r) => r.weekday === weekday)
      .map((r) => this.toInterval(r.start_time, r.end_time));

    const extra = overrides
      .filter((o) => o.type === "extra")
      .map((o) => this.toInterval(o.start_time, o.end_time));

    return [...fromRules, ...extra];
  }

  /** Busy windows: `block` overrides plus appointments padded by buffers. */
  private busyIntervals(): Interval[] {
    const { overrides, appointments, bufferBeforeMin, bufferAfterMin } =
      this.input;

    const blocks = overrides
      .filter((o) => o.type === "block")
      .map((o) => this.toInterval(o.start_time, o.end_time));

    const appts = appointments.map((a) => ({
      start: new Date(new Date(a.start_at).getTime() - minutesToMs(bufferBeforeMin)),
      end: new Date(new Date(a.end_at).getTime() + minutesToMs(bufferAfterMin)),
    }));

    return [...blocks, ...appts];
  }

  private toInterval(startTime: string, endTime: string): Interval {
    const { dateISO, timeZone } = this.input;
    return {
      start: zonedDateTime(dateISO, startTime, timeZone),
      end: zonedDateTime(dateISO, endTime, timeZone),
    };
  }
}
