import { NextResponse, type NextRequest } from "next/server";
import { SubscriptionService } from "@/lib/integrations/billing/subscription-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Iyzico subscription webhook. Maps subscription lifecycle events to plan
 * changes. The tenant is resolved from the subscription reference we stored at
 * activation time. Unknown/irrelevant events are acknowledged as no-ops.
 */
export async function POST(request: NextRequest) {
  let payload: {
    iyziReferenceCode?: string;
    subscriptionReferenceCode?: string;
    subscriptionStatus?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  const ref =
    payload.subscriptionReferenceCode ?? payload.iyziReferenceCode ?? "";
  const status = (payload.subscriptionStatus ?? "").toUpperCase();
  if (!ref) return NextResponse.json({ ok: true });

  const db = createSupabaseAdminClient();
  const { data: sub } = await db
    .from("subscriptions")
    .select("tenant_id")
    .eq("iyzico_ref", ref)
    .maybeSingle();
  if (!sub) return NextResponse.json({ ok: true });

  const service = new SubscriptionService();
  const tenantId = sub.tenant_id as string;

  if (status === "ACTIVE" || status === "TRIAL") {
    await service.activatePro(tenantId, ref);
  } else if (["CANCELED", "CANCELLED", "EXPIRED", "UNPAID"].includes(status)) {
    await service.downgradeToFree(tenantId);
  }

  return NextResponse.json({ ok: true });
}
