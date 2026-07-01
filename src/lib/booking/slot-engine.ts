import type { Service } from "@/lib/types";
import { AvailabilityResolver, type ResolverInput } from "./availability-resolver";
import { type Interval, minutesToMs } from "./time";

export interface Slot {
  start: Date;
  end: Date;
}

export interface SlotEngineInput
  extends Omit<ResolverInput, "bufferBeforeMin" | "bufferAfterMin"> {
  service: Pick<
    Service,
    "duration_min" | "buffer_before_min" | "buffer_after_min"
  >;
  /** Slot start granularity in minutes (e.g. 15). */
  granularityMin?: number;
  /** Slots starting before this instant are excluded (e.g. now + lead time). */
  notBefore?: Date;
}

/**
 * Generates bookable slots for one staff member on one date for one service.
 * Delegates free-time resolution to {@link AvailabilityResolver}, then slices
 * each free window into service-duration slots on the given granularity.
 */
export class SlotEngine {
  private readonly granularityMin: number;

  constructor(private readonly input: SlotEngineInput) {
    this.granularityMin = input.granularityMin ?? 15;
  }

  generate(): Slot[] {
    const free = new AvailabilityResolver({
      ...this.input,
      bufferBeforeMin: this.input.service.buffer_before_min,
      bufferAfterMin: this.input.service.buffer_after_min,
    }).resolve();

    return free.flatMap((window) => this.sliceWindow(window));
  }

  private sliceWindow(window: Interval): Slot[] {
    const { service, notBefore } = this.input;
    const durationMs = minutesToMs(service.duration_min);
    const stepMs = minutesToMs(this.granularityMin);
    const slots: Slot[] = [];

    let start = window.start.getTime();
    while (start + durationMs <= window.end.getTime()) {
      const slotStart = new Date(start);
      if (!notBefore || slotStart >= notBefore) {
        slots.push({ start: slotStart, end: new Date(start + durationMs) });
      }
      start += stepMs;
    }
    return slots;
  }
}
