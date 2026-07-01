import { describe, expect, it } from "vitest";
import { DepositCalculator, type DepositPolicy } from "./deposit-calculator";

function policy(over: Partial<DepositPolicy>): DepositPolicy {
  return {
    deposit_type: "none",
    deposit_value: 0,
    require_payment: false,
    price: 100,
    ...over,
  };
}

describe("DepositCalculator.amountDue", () => {
  it("returns 0 when no deposit and payment not required", () => {
    expect(DepositCalculator.amountDue(policy({}))).toBe(0);
  });

  it("returns the flat fixed deposit", () => {
    expect(
      DepositCalculator.amountDue(
        policy({ deposit_type: "fixed", deposit_value: 20 }),
      ),
    ).toBe(20);
  });

  it("caps a fixed deposit at the service price", () => {
    expect(
      DepositCalculator.amountDue(
        policy({ deposit_type: "fixed", deposit_value: 250, price: 100 }),
      ),
    ).toBe(100);
  });

  it("computes a percent deposit", () => {
    expect(
      DepositCalculator.amountDue(
        policy({ deposit_type: "percent", deposit_value: 25, price: 80 }),
      ),
    ).toBe(20);
  });

  it("clamps percent above 100", () => {
    expect(
      DepositCalculator.amountDue(
        policy({ deposit_type: "percent", deposit_value: 150, price: 40 }),
      ),
    ).toBe(40);
  });

  it("rounds to 2 decimals", () => {
    expect(
      DepositCalculator.amountDue(
        policy({ deposit_type: "percent", deposit_value: 33, price: 10 }),
      ),
    ).toBe(3.3);
  });

  it("charges full price when require_payment is set, ignoring deposit policy", () => {
    expect(
      DepositCalculator.amountDue(
        policy({ require_payment: true, deposit_type: "fixed", deposit_value: 5, price: 60 }),
      ),
    ).toBe(60);
  });
});

describe("DepositCalculator helpers", () => {
  it("requiresUpfrontPayment reflects a positive amount", () => {
    expect(DepositCalculator.requiresUpfrontPayment(policy({}))).toBe(false);
    expect(
      DepositCalculator.requiresUpfrontPayment(
        policy({ deposit_type: "fixed", deposit_value: 10 }),
      ),
    ).toBe(true);
  });

  it("noShowFee equals the deposit amount due", () => {
    expect(
      DepositCalculator.noShowFee(
        policy({ deposit_type: "percent", deposit_value: 50, price: 40 }),
      ),
    ).toBe(20);
  });
});
