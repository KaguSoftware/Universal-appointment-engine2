import { describe, expect, it } from "vitest";
import {
  AnalyticsCalculator,
  type AnalyticsAppointment,
  type AnalyticsPayment,
} from "./analytics-calculator";

function appt(over: Partial<AnalyticsAppointment>): AnalyticsAppointment {
  return {
    status: "completed",
    start_at: "2025-06-16T09:00:00Z",
    end_at: "2025-06-16T09:30:00Z", // 30 min
    service_id: "svc-1",
    service_name: "Haircut",
    price_snapshot: null,
    service_price: 25,
    customer_record_id: "cust-1",
    customer_name: "Alice",
    ...over,
  };
}

describe("AnalyticsCalculator.summary", () => {
  it("counts statuses and sums booked minutes for booked+completed", () => {
    const s = AnalyticsCalculator.summary(
      [
        appt({ status: "completed" }),
        appt({ status: "booked" }),
        appt({ status: "cancelled" }),
        appt({ status: "no_show" }),
      ],
      [],
      0,
    );
    expect(s.bookings).toBe(4);
    expect(s.completed).toBe(1);
    expect(s.cancelled).toBe(1);
    expect(s.noShows).toBe(1);
    expect(s.bookedMinutes).toBe(60); // completed + booked, 30 each
  });

  it("sums only succeeded payments for revenue", () => {
    const payments: AnalyticsPayment[] = [
      { amount: 25, status: "succeeded" },
      { amount: 10, status: "succeeded" },
      { amount: 99, status: "failed" },
    ];
    const s = AnalyticsCalculator.summary([], payments, 0);
    expect(s.revenue).toBe(35);
  });

  it("computes no-show rate over resolved (completed + no_show)", () => {
    const s = AnalyticsCalculator.summary(
      [
        appt({ status: "completed" }),
        appt({ status: "completed" }),
        appt({ status: "completed" }),
        appt({ status: "no_show" }),
        appt({ status: "cancelled" }), // excluded from denominator
      ],
      [],
      0,
    );
    expect(s.noShowRate).toBe(0.25); // 1 / (3+1)
  });

  it("computes utilization capped at 1", () => {
    const s = AnalyticsCalculator.summary(
      [appt({ status: "completed" })], // 30 booked min
      [],
      120,
    );
    expect(s.utilization).toBe(0.25);
  });

  it("reports zero rates with no data", () => {
    const s = AnalyticsCalculator.summary([], [], 0);
    expect(s.noShowRate).toBe(0);
    expect(s.utilization).toBe(0);
    expect(s.revenue).toBe(0);
  });
});

describe("AnalyticsCalculator rankings", () => {
  it("ranks top services by count then revenue", () => {
    const top = AnalyticsCalculator.topServices([
      appt({ service_id: "a", service_name: "A", service_price: 10 }),
      appt({ service_id: "a", service_name: "A", service_price: 10 }),
      appt({ service_id: "b", service_name: "B", service_price: 50 }),
    ]);
    expect(top[0].id).toBe("a");
    expect(top[0].count).toBe(2);
    expect(top[0].revenue).toBe(20);
  });

  it("prefers price_snapshot over service_price for revenue", () => {
    const top = AnalyticsCalculator.topServices([
      appt({ service_id: "a", price_snapshot: 99, service_price: 10 }),
    ]);
    expect(top[0].revenue).toBe(99);
  });

  it("excludes appointments without a customer record from top customers", () => {
    const top = AnalyticsCalculator.topCustomers([
      appt({ customer_record_id: null }),
      appt({ customer_record_id: "c1", customer_name: "Bob" }),
    ]);
    expect(top).toHaveLength(1);
    expect(top[0].name).toBe("Bob");
  });
});
