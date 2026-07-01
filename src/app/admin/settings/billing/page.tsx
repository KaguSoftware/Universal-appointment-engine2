import { startProCheckout } from "@/app/admin/settings/billing/actions";
import { TenantContext } from "@/lib/tenant/tenant-context";

const PRO_FEATURES = [
  "Unlimited staff",
  "SMS reminders",
  "Email reminders",
  "Google Calendar sync",
  "Custom branding & terminology",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await TenantContext.require();
  const { status } = await searchParams;
  const isPro = ctx.tenant.plan === "pro";

  return (
    <main className="mx-auto max-w-lg space-y-6 py-4">
      <h1 className="text-3xl font-semibold">Plan &amp; billing</h1>

      {status === "success" && (
        <p className="rounded-xl border border-success/30 bg-[color-mix(in_oklab,var(--success)_10%,transparent)] p-3 text-sm text-success">
          You&apos;re on Pro. Thanks for upgrading!
        </p>
      )}
      {status === "failed" && (
        <p className="rounded-xl border border-danger/30 bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-sm text-danger">
          Payment could not be verified. Please try again.
        </p>
      )}

      <div className="card p-5">
        <p className="label-text">Current plan</p>
        <p className="mt-1 text-xl font-semibold capitalize">{ctx.tenant.plan}</p>
      </div>

      {!isPro && (
        <div className="glass p-6">
          <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-brand-accent">✓</span> {f}
              </li>
            ))}
          </ul>
          <form action={startProCheckout} className="mt-5">
            <button className="btn-accent">Upgrade with Iyzico</button>
          </form>
        </div>
      )}
    </main>
  );
}
