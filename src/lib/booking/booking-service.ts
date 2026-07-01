import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Appointment,
  AvailabilityOverride,
  AvailabilityRule,
  ManagedAppointment,
  Service,
} from "@/lib/types";
import { BookingRepository } from "./booking-repository";
import { SlotEngine, type Slot } from "./slot-engine";

/** Minimum lead time before a slot can be booked. */
const DEFAULT_LEAD_MINUTES = 60;

/**
 * Orchestrates the public booking use-cases: listing available slots for a
 * date and creating/cancelling appointments. Combines {@link BookingRepository}
 * (data) with {@link SlotEngine} (pure slot math).
 */
export class BookingService {
  private readonly repo: BookingRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.repo = new BookingRepository(supabase);
  }

  get repository(): BookingRepository {
    return this.repo;
  }

  /** Bookable slots for a staff member + service on a single date. */
  async slotsForDate(
    service: Service,
    staffId: string,
    dateISO: string,
    timeZone: string,
    excludeAppointmentId?: string,
  ): Promise<Slot[]> {
    const data = await this.repo.getAvailabilityData(
      staffId,
      dateISO,
      dateISO,
      excludeAppointmentId,
    );

    const engine = new SlotEngine({
      dateISO,
      timeZone,
      rules: data.rules as AvailabilityRule[],
      overrides: data.overrides as AvailabilityOverride[],
      appointments: data.appointments as Appointment[],
      service,
      notBefore: new Date(Date.now() + DEFAULT_LEAD_MINUTES * 60_000),
    });
    return engine.generate();
  }

  /**
   * Create an appointment via the transactional RPC. Works for a logged-in
   * customer (guest fields omitted) or a guest (name + email/phone required).
   * Throws a coded error.
   */
  async book(params: {
    tenantId: string;
    serviceId: string;
    staffId: string;
    startISO: string;
    notes?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
  }): Promise<Appointment> {
    const { data, error } = await this.supabase
      .rpc("create_appointment", {
        p_tenant: params.tenantId,
        p_service: params.serviceId,
        p_staff: params.staffId,
        p_start: params.startISO,
        p_notes: params.notes ?? null,
        p_guest_name: params.guestName ?? null,
        p_guest_email: params.guestEmail ?? null,
        p_guest_phone: params.guestPhone ?? null,
      })
      .single<Appointment>();
    if (error) throw new Error(error.message);
    return data;
  }

  /** Admin/staff walk-in booking on behalf of a (guest) customer. */
  async bookAsAdmin(params: {
    tenantId: string;
    serviceId: string;
    staffId: string;
    startISO: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    notes?: string;
  }): Promise<Appointment> {
    const { data, error } = await this.supabase
      .rpc("create_appointment_admin", {
        p_tenant: params.tenantId,
        p_service: params.serviceId,
        p_staff: params.staffId,
        p_start: params.startISO,
        p_guest_name: params.guestName,
        p_guest_email: params.guestEmail ?? null,
        p_guest_phone: params.guestPhone ?? null,
        p_notes: params.notes ?? null,
      })
      .single<Appointment>();
    if (error) throw new Error(error.message);
    return data;
  }

  /** Look up one appointment by its management token (account-less access). */
  async getByToken(token: string): Promise<ManagedAppointment | null> {
    const { data, error } = await this.supabase
      .rpc("manage_get_appointment", { p_token: token })
      .maybeSingle<ManagedAppointment>();
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  /** Cancel by management token. */
  async cancelByToken(token: string): Promise<Appointment> {
    const { data, error } = await this.supabase
      .rpc("cancel_by_token", { p_token: token })
      .single<Appointment>();
    if (error) throw new Error(error.message);
    return data;
  }

  /** Reschedule by management token. */
  async rescheduleByToken(
    token: string,
    startISO: string,
  ): Promise<Appointment> {
    const { data, error } = await this.supabase
      .rpc("reschedule_by_token", { p_token: token, p_start: startISO })
      .single<Appointment>();
    if (error) throw new Error(error.message);
    return data;
  }

  async cancel(appointmentId: string): Promise<Appointment> {
    const { data, error } = await this.supabase
      .rpc("cancel_appointment", { p_appointment: appointmentId })
      .single<Appointment>();
    if (error) throw new Error(error.message);
    return data;
  }

  /** Move an existing appointment to a new start time via the RPC. */
  async reschedule(
    appointmentId: string,
    startISO: string,
  ): Promise<Appointment> {
    const { data, error } = await this.supabase
      .rpc("reschedule_appointment", {
        p_appointment: appointmentId,
        p_start: startISO,
      })
      .single<Appointment>();
    if (error) throw new Error(error.message);
    return data;
  }
}
