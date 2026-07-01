/**
 * Core domain types shared across the appointment engine.
 * These mirror the Postgres schema (see supabase/migrations).
 */

export type VerticalId =
  | "barbershop"
  | "dentist"
  | "tutor"
  | "therapist"
  | "mechanic";

export type PlanId = "free" | "pro";

export type MembershipRole = "admin" | "staff";

export type AppointmentStatus =
  | "booked"
  | "cancelled"
  | "completed"
  | "no_show";

export type OverrideType = "block" | "extra";

export type PaymentStatus =
  | "none"
  | "deposit_paid"
  | "paid"
  | "refunded"
  | "failed";

export type DepositType = "none" | "fixed" | "percent";

export type PaymentKind = "deposit" | "full" | "no_show_fee" | "refund";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  vertical: VerticalId;
  plan: PlanId;
  timezone: string;
  /** Per-tenant overrides merged over the vertical preset defaults. */
  theme: TenantTheme;
  status: "active" | "suspended";
  created_at: string;
}

export interface TenantTheme {
  primary?: string;
  accent?: string;
  logoUrl?: string;
  terminology?: Partial<Terminology>;
}

export interface Terminology {
  provider: string;
  service: string;
  appointment: string;
  customer: string;
}

export interface Membership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface Staff {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  display_name: string;
  bio: string | null;
  color: string;
  google_calendar_connected: boolean;
  active: boolean;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  price: number;
  currency: string;
  active: boolean;
  category_id: string | null;
  image_url: string | null;
  sort: number;
  deposit_type: DepositType;
  deposit_value: number;
  require_payment: boolean;
}

export interface ServiceCategory {
  id: string;
  tenant_id: string;
  name: string;
  sort: number;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  total_no_shows: number;
  total_spend: number;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  appointment_id: string | null;
  amount: number;
  currency: string;
  kind: PaymentKind;
  iyzico_ref: string | null;
  status: string;
  created_at: string;
}

export interface AvailabilityRule {
  id: string;
  tenant_id: string;
  staff_id: string;
  weekday: number; // 0 = Sunday .. 6 = Saturday
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
}

export interface AvailabilityOverride {
  id: string;
  tenant_id: string;
  staff_id: string;
  date: string; // "yyyy-MM-dd"
  type: OverrideType;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
}

export interface Appointment {
  id: string;
  tenant_id: string;
  service_id: string;
  staff_id: string;
  /** Null for guest bookings (customer has no account). */
  customer_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  /** Unguessable token for account-less self-service management links. */
  manage_token: string;
  /** True when a tenant member created it (walk-in / phone booking). */
  created_by_staff: boolean;
  start_at: string; // ISO UTC
  end_at: string; // ISO UTC
  status: AppointmentStatus;
  notes: string | null;
  google_event_id: string | null;
  /** Tenant-scoped CRM customer (distinct from the auth-bound customer_id). */
  customer_record_id: string | null;
  price_snapshot: number | null;
  deposit_amount: number | null;
  payment_status: PaymentStatus;
  iyzico_payment_ref: string | null;
  created_at: string;
}

/** Flattened appointment view returned by the token-management RPC. */
export interface ManagedAppointment {
  id: string;
  tenant_id: string;
  service_id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  service_name: string;
  staff_name: string;
  tenant_name: string;
  tenant_slug: string;
  timezone: string;
}
