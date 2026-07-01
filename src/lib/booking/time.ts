import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** A half-open time interval [start, end) in absolute (UTC) instants. */
export interface Interval {
  start: Date;
  end: Date;
}

export function minutesToMs(min: number): number {
  return min * 60_000;
}

/** Parse "HH:mm" into minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Build a UTC instant for a given calendar date + "HH:mm" wall-clock time
 * interpreted in `timeZone`.
 */
export function zonedDateTime(
  dateISO: string,
  time: string,
  timeZone: string,
): Date {
  const [h, m] = time.split(":");
  // A wall-clock string with no offset; `fromZonedTime` interprets the fields
  // as local time in `timeZone` and returns the corresponding UTC instant.
  const wallClock = `${dateISO}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
  return fromZonedTime(wallClock, timeZone);
}

/** The weekday (0=Sun..6=Sat) of a calendar date in the given zone. */
export function weekdayInZone(dateISO: string, timeZone: string): number {
  const noon = zonedDateTime(dateISO, "12:00", timeZone);
  // date-fns "i" = ISO day 1..7 (Mon..Sun); convert to JS 0..6 (Sun..Sat).
  const iso = Number(formatInTimeZone(noon, timeZone, "i"));
  return iso % 7;
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Subtract a set of busy intervals from a single free interval. */
export function subtractIntervals(
  free: Interval,
  busy: Interval[],
): Interval[] {
  let segments: Interval[] = [{ ...free }];
  for (const b of busy) {
    const next: Interval[] = [];
    for (const seg of segments) {
      if (!intervalsOverlap(seg, b)) {
        next.push(seg);
        continue;
      }
      if (b.start > seg.start) next.push({ start: seg.start, end: b.start });
      if (b.end < seg.end) next.push({ start: b.end, end: seg.end });
    }
    segments = next;
  }
  return segments;
}
