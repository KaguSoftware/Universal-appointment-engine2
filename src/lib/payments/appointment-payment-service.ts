import type { SupabaseClient } from "@supabase/supabase-js";
import type { Payment, PaymentKind, Service } from "@/lib/types";
import { DepositCalculator, type DepositPolicy } from "./deposit-calculator";

/**
 * Records per-appointment payments (deposits / full charges / refunds) through
 * the SECURITY DEFINER `record_appointment_payment` RPC, so no service-role
 * client is needed in app code. Deposit amounts come from the pure
 * {@link DepositCalculator}.
 */
export class AppointmentPaymentService {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Amount that must be collected up front for a service. */
  amountDue(service: Service): number {
    return DepositCalculator.amountDue(toPolicy(service));
  }

  requiresUpfrontPayment(service: Service): boolean {
    return DepositCalculator.requiresUpfrontPayment(toPolicy(service));
  }

  /** Record a captured payment and advance the appointment's payment_status. */
  async record(params: {
    appointmentId: string;
    amount: number;
    kind: PaymentKind;
    iyzicoRef?: string;
    status?: "succeeded" | "failed" | "pending";
  }): Promise<Payment> {
    const { data, error } = await this.supabase
      .rpc("record_appointment_payment", {
        p_appointment: params.appointmentId,
        p_amount: params.amount,
        p_kind: params.kind,
        p_iyzico_ref: params.iyzicoRef ?? null,
        p_status: params.status ?? "succeeded",
      })
      .single<Payment>();
    if (error) throw new Error(error.message);
    return data;
  }
}

function toPolicy(service: Service): DepositPolicy {
  return {
    deposit_type: service.deposit_type,
    deposit_value: service.deposit_value,
    require_payment: service.require_payment,
    price: service.price,
  };
}
