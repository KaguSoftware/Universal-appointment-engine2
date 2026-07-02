import Link from "next/link";
import { tenantAllows } from "@/lib/feature-gate";
import { AnalyticsService } from "@/lib/analytics/analytics-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
type RangeKey = keyof typeof RANGES;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await TenantContext.require();

  if (!tenantAllows(ctx.tenant, "analytics")) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold">Insights</h1>
        <div className="glass p-10 text-center text-sm text-muted">
          Revenue, utilization and no-show analytics are a Pro feature.{" "}
          <Link href="/admin/settings/billing" className="link-muted underline">
            Upgrade to unlock
          </Link>
          .
        </div>
      </div>
    );
  }

  const { range } = await searchParams;
  const days = RANGES[(range as RangeKey) ?? "30d"] ?? 30;
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);

  const supabase = await createSupabaseServerClient();
  const data = await new AnalyticsService(supabase, ctx.tenant.id).dashboard(
    from.toISOString(),
    to.toISOString(),
  );
  const { summary, topServices, topCustomers } = data;
  const money = (n: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Insights</h1>
        <div className="flex gap-2 text-sm">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin/insights?range=${k}`}
              aria-current={
                (range ?? "30d") === k || (!range && k === "30d")
                  ? "page"
                  : undefined
              }
              className="btn-ghost px-3 py-1 aria-[current=page]:bg-[var(--surface-strong)]"
            >
              {k}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue" value={money(summary.revenue)} />
        <Stat label="Bookings" value={String(summary.bookings)} />
        <Stat
          label="No-show rate"
          value={`${Math.round(summary.noShowRate * 100)}%`}
        />
        <Stat
          label="Utilization"
          value={`${Math.round(summary.utilization * 100)}%`}
        />
        <Stat label="Completed" value={String(summary.completed)} />
        <Stat label="Cancelled" value={String(summary.cancelled)} />
        <Stat label="No-shows" value={String(summary.noShows)} />
        <Stat
          label="Booked hours"
          value={(summary.bookedMinutes / 60).toFixed(1)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RankCard title="Top services" items={topServices} money={money} />
        <RankCard title="Top customers" items={topCustomers} money={money} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card animate-rise p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RankCard({
  title,
  items,
  money,
}: {
  title: string;
  items: { id: string; name: string; count: number; revenue: number }[];
  money: (n: number) => string;
}) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{it.name}</span>
              <span className="text-muted tabular-nums">
                {it.count} · {money(it.revenue)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
