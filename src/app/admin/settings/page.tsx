import Link from "next/link";
import { updateSettings } from "@/app/admin/settings/actions";
import { tenantAllows } from "@/lib/feature-gate";
import { TenantContext } from "@/lib/tenant/tenant-context";
import { resolveTerminology } from "@/lib/verticals";

export default async function SettingsPage() {
  const ctx = await TenantContext.require();
  const terms = resolveTerminology(ctx.tenant);
  const branding = tenantAllows(ctx.tenant, "custom_branding");

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <form action={updateSettings} className="space-y-4">
        <Text name="name" label="Business name" value={ctx.tenant.name} />
        <Text name="timezone" label="Timezone" value={ctx.tenant.timezone} />

        <fieldset
          className="space-y-3 rounded-lg border p-4"
          disabled={!branding}
        >
          <legend className="px-1 text-sm font-medium">
            Branding {!branding && "(Pro)"}
          </legend>
          <div className="flex gap-4">
            <Color name="primary" label="Primary" value={ctx.tenant.theme.primary} />
            <Color name="accent" label="Accent" value={ctx.tenant.theme.accent} />
          </div>
          <Text name="term_provider" label="Provider label" value={terms.provider} />
          <Text name="term_service" label="Service label" value={terms.service} />
          <Text name="term_appointment" label="Appointment label" value={terms.appointment} />
          <Text name="term_customer" label="Customer label" value={terms.customer} />
          {!branding && (
            <p className="text-sm text-amber-700">
              <Link href="/admin/settings/billing" className="underline">
                Upgrade to Pro
              </Link>{" "}
              to customize branding and terminology.
            </p>
          )}
        </fieldset>

        <button className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900">
          Save settings
        </button>
      </form>

      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Plan &amp; billing</h2>
        <p className="mt-1 text-sm text-gray-500">
          You are on the <strong>{ctx.tenant.plan}</strong> plan.
        </p>
        <Link
          href="/admin/settings/billing"
          className="mt-2 inline-block text-sm underline"
        >
          Manage billing →
        </Link>
      </section>
    </div>
  );
}

function Text({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        defaultValue={value}
        className="w-full rounded border px-3 py-2 dark:bg-gray-900"
      />
    </label>
  );
}

function Color({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="color"
        name={name}
        defaultValue={value ?? "#1f2937"}
        className="block h-9 w-16"
      />
    </label>
  );
}
