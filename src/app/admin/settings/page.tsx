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
      <h1 className="text-3xl font-semibold">Settings</h1>

      <form action={updateSettings} className="card space-y-4 p-6">
        <Text name="name" label="Business name" value={ctx.tenant.name} />
        <Text name="timezone" label="Timezone" value={ctx.tenant.timezone} />

        <fieldset
          className="space-y-3 rounded-xl border border-border p-4"
          disabled={!branding}
        >
          <legend className="label-text px-1">
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
            <p className="text-sm text-warning">
              <Link href="/admin/settings/billing" className="underline font-medium">
                Upgrade to Pro
              </Link>{" "}
              to customize branding and terminology.
            </p>
          )}
        </fieldset>

        <button className="btn-primary">Save settings</button>
      </form>

      <section className="card p-6">
        <h2 className="font-semibold">Plan &amp; billing</h2>
        <p className="mt-1 text-sm text-muted">
          You are on the <strong className="text-foreground">{ctx.tenant.plan}</strong> plan.
        </p>
        <Link
          href="/admin/settings/billing"
          className="mt-3 inline-block text-sm font-medium text-brand-accent"
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
    <label className="block space-y-1.5">
      <span className="label-text">{label}</span>
      <input name={name} defaultValue={value} className="field" />
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
    <label className="space-y-1.5">
      <span className="label-text">{label}</span>
      <input
        type="color"
        name={name}
        defaultValue={value ?? "#1f2937"}
        className="block h-10 w-16 cursor-pointer rounded-lg border border-border-strong bg-transparent"
      />
    </label>
  );
}
