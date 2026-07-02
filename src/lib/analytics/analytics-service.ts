import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvailabilityRule } from "@/lib/types";
import {
  AnalyticsCalculator,
  type AnalyticsAppointment,
  type AnalyticsPayment,
  type AnalyticsSummary,
  type RankedItem,
} from "./analytics-calculator";

export interface DashboardData {
  summary: AnalyticsSummary;
  topServices: RankedItem[];
  topCustomers: RankedItem[];
}

interface ApptRow {
  status: AnalyticsAppointment["status"];
  start_at: string;
  end_at: string;
  service_id: string;
  price_snapshot: number | null;
  customer_record_id: string | null;
  services: { name: string; price: number } | null;
  customers: { name: string } | null;
}

/**
 * Loads appointments + payments for a date range and turns them into dashboard
 * metrics via the pure {@link AnalyticsCalculator}. Tenant-scoped; relies on RLS.
 */
export class AnalyticsService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly tenantId: string,
  ) {}

  async dashboard(fromISO: string, toISO: string): Promise<DashboardData> {
    const [appts, payments, availableMinutes] = await Promise.all([
      this.loadAppointments(fromISO, toISO),
      this.loadPayments(fromISO, toISO),
      this.availableMinutes(fromISO, toISO),
    ]);

    return {
      summary: AnalyticsCalculator.summary(appts, payments, availableMinutes),
      topServices: AnalyticsCalculator.topServices(appts),
      topCustomers: AnalyticsCalculator.topCustomers(appts),
    };
  }

  private async loadAppointments(
    fromISO: string,
    toISO: string,
  ): Promise<AnalyticsAppointment[]> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select(
        "status, start_at, end_at, service_id, price_snapshot, customer_record_id, services(name, price), customers(name)",
      )
      .eq("tenant_id", this.tenantId)
      .gte("start_at", fromISO)
      .lt("start_at", toISO)
      .returns<ApptRow[]>();
    if (error) throw error;
    return (data ?? []).map((r) => ({
      status: r.status,
      start_at: r.start_at,
      end_at: r.end_at,
      service_id: r.service_id,
      service_name: r.services?.name ?? "—",
      price_snapshot: r.price_snapshot,
      service_price: r.services?.price ?? 0,
      customer_record_id: r.customer_record_id,
      customer_name: r.customers?.name ?? null,
    }));
  }

  private async loadPayments(
    fromISO: string,
    toISO: string,
  ): Promise<AnalyticsPayment[]> {
    const { data, error } = await this.supabase
      .from("payments")
      .select("amount, status")
      .eq("tenant_id", this.tenantId)
      .gte("created_at", fromISO)
      .lt("created_at", toISO)
      .returns<AnalyticsPayment[]>();
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Approximate available capacity: sum of weekly-rule minutes for each day in
   * the range. Overrides are ignored for this estimate (good enough for a
   * utilization headline; exact capacity would need per-day resolution).
   */
  private async availableMinutes(
    fromISO: string,
    toISO: string,
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from("availability_rules")
      .select("weekday, start_time, end_time")
      .eq("tenant_id", this.tenantId)
      .returns<Pick<AvailabilityRule, "weekday" | "start_time" | "end_time">[]>();
    if (error) throw error;
    const rules = data ?? [];
    if (rules.length === 0) return 0;

    const byWeekday = new Map<number, number>();
    for (const r of rules) {
      byWeekday.set(
        r.weekday,
        (byWeekday.get(r.weekday) ?? 0) + diffMinutes(r.start_time, r.end_time),
      );
    }

    let total = 0;
    const from = new Date(fromISO);
    const to = new Date(toISO);
    for (
      let d = new Date(from);
      d < to;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      total += byWeekday.get(d.getUTCDay()) ?? 0;
    }
    return total;
  }
}

function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}
