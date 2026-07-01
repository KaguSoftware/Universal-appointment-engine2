"use server";

import { redirect } from "next/navigation";
import { IyzicoProvider } from "@/lib/integrations/billing/iyzico-provider";
import { SubscriptionService } from "@/lib/integrations/billing/subscription-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function splitName(full: string): { name: string; surname: string } {
  const parts = full.trim().split(/\s+/);
  return {
    name: parts[0] || "Customer",
    surname: parts.slice(1).join(" ") || "-",
  };
}

export async function startProCheckout(): Promise<void> {
  const ctx = await TenantContext.require();
  ctx.requireAdmin();

  const planRef = process.env.IYZICO_PRO_PLAN_REF;
  if (!planRef) throw new Error("Pro plan is not configured (IYZICO_PRO_PLAN_REF).");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { name, surname } = splitName(
    (user?.user_metadata.full_name as string) ?? ctx.tenant.name,
  );

  const result = await new IyzicoProvider().startCheckout({
    tenantId: ctx.tenant.id,
    pricingPlanRef: planRef,
    customer: { email: user?.email ?? "", name, surname },
    callbackUrl: `${appUrl()}/admin/settings/billing/callback`,
  });

  if (!result.ok || !result.checkoutUrl) {
    throw new Error(result.error ?? "Could not start checkout.");
  }
  redirect(result.checkoutUrl);
}

/** Dev/test helper wired to the webhook path — not for production billing. */
export async function verifyAndActivate(token: string): Promise<boolean> {
  const ctx = await TenantContext.require();
  const result = await new IyzicoProvider().verifyCheckout(token);
  if (!result.ok) return false;
  await new SubscriptionService().activatePro(ctx.tenant.id, result.subscriptionRef);
  return true;
}
