import { NextResponse, type NextRequest } from "next/server";
import { IyzicoProvider } from "@/lib/integrations/billing/iyzico-provider";
import { SubscriptionService } from "@/lib/integrations/billing/subscription-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

const BILLING = "/admin/settings/billing";

/** Iyzico posts the checkout token here after the hosted payment flow. */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const token = String(form.get("token") ?? "");

  if (!token) {
    return NextResponse.redirect(`${origin}${BILLING}?status=failed`, 303);
  }

  // Resolve the acting admin's tenant from their session.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/auth/login`, 303);

  const ctx = await TenantContext.require();
  const result = await new IyzicoProvider().verifyCheckout(token);

  if (!result.ok) {
    return NextResponse.redirect(`${origin}${BILLING}?status=failed`, 303);
  }

  await new SubscriptionService().activatePro(ctx.tenant.id, result.subscriptionRef);
  return NextResponse.redirect(`${origin}${BILLING}?status=success`, 303);
}
