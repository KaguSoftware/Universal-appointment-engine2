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
      <h1 className="text-2xl font-bold">Plan &amp; billing</h1>

      {status === "success" && (
        <p className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          You&apos;re on Pro. Thanks for upgrading!
        </p>
      )}
      {status === "failed" && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Payment could not be verified. Please try again.
        </p>
      )}

      <div className="rounded-lg border p-5">
        <p className="text-sm text-gray-500">Current plan</p>
        <p className="text-xl font-semibold capitalize">{ctx.tenant.plan}</p>
      </div>

      {!isPro && (
        <div className="rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <form action={startProCheckout} className="mt-4">
            <button className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900">
              Upgrade with Iyzico
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
