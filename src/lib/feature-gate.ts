import type { PlanId, Tenant } from "@/lib/types";

/** Feature keys that can be gated behind a plan tier. */
export type Feature =
  | "sms_reminders"
  | "email_reminders"
  | "google_calendar"
  | "custom_branding"
  | "unlimited_staff"
  | "deposits"
  | "no_show_protection"
  | "analytics";

const PLAN_FEATURES: Record<PlanId, Feature[]> = {
  free: [],
  pro: [
    "sms_reminders",
    "email_reminders",
    "google_calendar",
    "custom_branding",
    "unlimited_staff",
    "deposits",
    "no_show_protection",
    "analytics",
  ],
};

/** Max active staff a plan allows. `Infinity` means unlimited. */
const STAFF_LIMIT: Record<PlanId, number> = {
  free: 1,
  pro: Infinity,
};

export function planAllows(plan: PlanId, feature: Feature): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

export function tenantAllows(tenant: Tenant, feature: Feature): boolean {
  return planAllows(tenant.plan, feature);
}

export function staffLimit(plan: PlanId): number {
  return STAFF_LIMIT[plan];
}

export function canAddStaff(plan: PlanId, currentActiveCount: number): boolean {
  return currentActiveCount < STAFF_LIMIT[plan];
}
