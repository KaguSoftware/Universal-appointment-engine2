import type { DepositType } from "@/lib/types";

/** The deposit policy fields carried by a service. */
export interface DepositPolicy {
  deposit_type: DepositType;
  deposit_value: number;
  require_payment: boolean;
  price: number;
}

/**
 * Pure deposit math. Given a service's deposit policy and price, compute the
 * amount due up front at booking time. Kept dependency-free and unit-tested,
 * mirroring the booking-math convention in {@link src/lib/booking}.
 */
export class DepositCalculator {
  /**
   * Amount the customer must pay to hold the appointment, rounded to 2 dp.
   *
   * - `none`    → 0 unless the whole service must be prepaid (`require_payment`).
   * - `fixed`   → the flat deposit_value, capped at the service price.
   * - `percent` → deposit_value percent of the price (0–100).
   *
   * When `require_payment` is set, the full price is always due regardless of
   * the deposit policy.
   */
  static amountDue(policy: DepositPolicy): number {
    const price = Math.max(0, policy.price);

    if (policy.require_payment) {
      return round2(price);
    }

    switch (policy.deposit_type) {
      case "fixed":
        return round2(Math.min(Math.max(0, policy.deposit_value), price));
      case "percent": {
        const pct = clamp(policy.deposit_value, 0, 100);
        return round2((price * pct) / 100);
      }
      case "none":
      default:
        return 0;
    }
  }

  /** Whether any money is collected up front for this service. */
  static requiresUpfrontPayment(policy: DepositPolicy): boolean {
    return DepositCalculator.amountDue(policy) > 0;
  }

  /**
   * Fee to charge a no-show. We charge the deposit that was (or would have
   * been) taken; if the service takes no deposit, there is nothing to charge.
   */
  static noShowFee(policy: DepositPolicy): number {
    return DepositCalculator.amountDue(policy);
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
