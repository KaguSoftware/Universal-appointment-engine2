export interface CheckoutInitResult {
  ok: boolean;
  /** Iyzico checkout form token, used to verify the result later. */
  token?: string;
  /** Hosted checkout page URL to redirect the customer to. */
  checkoutUrl?: string;
  error?: string;
}

export interface CheckoutVerifyResult {
  ok: boolean;
  /** Iyzico subscription reference code once active. */
  subscriptionRef?: string;
  status?: string;
  error?: string;
}

export interface StartCheckoutInput {
  tenantId: string;
  pricingPlanRef: string; // Iyzico pricing plan reference code (Pro plan)
  customer: {
    email: string;
    name: string;
    surname: string;
  };
  callbackUrl: string;
}

/** Abstracts the platform subscription-billing provider (Iyzico). */
export interface BillingProvider {
  startCheckout(input: StartCheckoutInput): Promise<CheckoutInitResult>;
  verifyCheckout(token: string): Promise<CheckoutVerifyResult>;
}
