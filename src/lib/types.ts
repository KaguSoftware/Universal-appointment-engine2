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
  customer_id: string;
  start_at: string; // ISO UTC
  end_at: string; // ISO UTC
  status: AppointmentStatus;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
}
