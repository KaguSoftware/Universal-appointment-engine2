import type { AppointmentStatus } from "@/lib/types";

/** Minimal appointment shape the analytics math needs. */
export interface AnalyticsAppointment {
  status: AppointmentStatus;
  start_at: string;
  end_at: string;
  service_id: string;
  service_name: string;
  price_snapshot: number | null;
  service_price: number;
  customer_record_id: string | null;
  customer_name: string | null;
}

export interface AnalyticsPayment {
  amount: number;
  status: string;
}

export interface AnalyticsSummary {
  bookings: number;
  completed: number;
  cancelled: number;
  noShows: number;
  noShowRate: number;
  revenue: number;
  bookedMinutes: number;
  utilization: number;
}

export interface RankedItem {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

/**
 * Pure aggregation over a set of appointments + payments. No I/O — the
 * repository loads rows, this turns them into dashboard metrics. Unit-tested.
 */
export class AnalyticsCalculator {
  /**
   * @param availableMinutes Total staff working minutes in the range (for
   *   utilization). Pass 0 to report utilization as 0.
   */
  static summary(
    appts: AnalyticsAppointment[],
    payments: AnalyticsPayment[],
    availableMinutes: number,
  ): AnalyticsSummary {
    let completed = 0;
    let cancelled = 0;
    let noShows = 0;
    let bookedMinutes = 0;

    for (const a of appts) {
      if (a.status === "completed") completed += 1;
      else if (a.status === "cancelled") cancelled += 1;
      else if (a.status === "no_show") noShows += 1;

      if (a.status === "booked" || a.status === "completed") {
        bookedMinutes += minutesBetween(a.start_at, a.end_at);
      }
    }

    const revenue = round2(
      payments
        .filter((p) => p.status === "succeeded")
        .reduce((sum, p) => sum + p.amount, 0),
    );

    // No-show rate is over appointments that actually resolved to a terminal
    // attended/absent state (completed + no_show), not raw bookings.
    const resolved = completed + noShows;
    const noShowRate = resolved === 0 ? 0 : round2(noShows / resolved);

    const utilization =
      availableMinutes <= 0
        ? 0
        : round2(Math.min(1, bookedMinutes / availableMinutes));

    return {
      bookings: appts.length,
      completed,
      cancelled,
      noShows,
      noShowRate,
      revenue,
      bookedMinutes,
      utilization,
    };
  }

  /** Top services by booking count (revenue as tiebreak/secondary metric). */
  static topServices(appts: AnalyticsAppointment[], limit = 5): RankedItem[] {
    return rank(
      appts,
      (a) => ({ id: a.service_id, name: a.service_name }),
      limit,
    );
  }

  /** Top customers by booking count. */
  static topCustomers(appts: AnalyticsAppointment[], limit = 5): RankedItem[] {
    return rank(
      appts.filter((a) => a.customer_record_id),
      (a) => ({ id: a.customer_record_id!, name: a.customer_name ?? "—" }),
      limit,
    );
  }
}

function rank(
  appts: AnalyticsAppointment[],
  key: (a: AnalyticsAppointment) => { id: string; name: string },
  limit: number,
): RankedItem[] {
  const map = new Map<string, RankedItem>();
  for (const a of appts) {
    const { id, name } = key(a);
    const revenue = a.price_snapshot ?? a.service_price ?? 0;
    const cur = map.get(id) ?? { id, name, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue = round2(cur.revenue + revenue);
    cur.name = name;
    map.set(id, cur);
  }
  return [...map.values()]
    .sort((x, y) => y.count - x.count || y.revenue - x.revenue)
    .slice(0, limit);
}

function minutesBetween(startISO: string, endISO: string): number {
  return Math.max(
    0,
    (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000,
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
