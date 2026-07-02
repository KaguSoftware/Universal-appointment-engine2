import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Service } from "@/lib/types";
import { DepositCalculator, type DepositPolicy } from "./deposit-calculator";

/**
 * Marks an appointment as no-show and, per the service's deposit policy,
 * records a no-show fee + bumps the customer's no-show counter. Delegates the
 * write to the SECURITY DEFINER `charge_no_show` RPC.
 */
export class NoShowChargeService {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Fee that would be charged for a no-show of this service. */
  feeFor(service: Service): number {
    return DepositCalculator.noShowFee(toPolicy(service));
  }

  /**
   * Mark no-show and charge the fee. `iyzicoRef` is the reference of an actual
   * capture if one was performed against a stored card; when absent the fee is
   * still recorded (e.g. the deposit already collected is forfeited).
   */
  async chargeNoShow(params: {
    appointmentId: string;
    service: Service;
    iyzicoRef?: string;
  }): Promise<Appointment> {
    const fee = this.feeFor(params.service);
    const { data, error } = await this.supabase
      .rpc("charge_no_show", {
        p_appointment: params.appointmentId,
        p_fee: fee,
        p_iyzico_ref: params.iyzicoRef ?? null,
      })
      .single<Appointment>();
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
