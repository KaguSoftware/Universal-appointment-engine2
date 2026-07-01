import "server-only";
import Iyzipay from "iyzipay";
import type {
  BillingProvider,
  CheckoutInitResult,
  CheckoutVerifyResult,
  StartCheckoutInput,
} from "./types";

/** Promisifies an iyzipay callback-style call. */
function call<T>(fn: (cb: (err: unknown, result: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => (err ? reject(err) : resolve(result)));
  });
}

interface IyzicoFormResult {
  status: string;
  errorMessage?: string;
  token?: string;
  checkoutFormContent?: string;
  payWithIyzicoPageUrl?: string;
  referenceCode?: string;
  subscriptionStatus?: string;
}

/**
 * Iyzico implementation of the platform BillingProvider using the hosted
 * subscription checkout form. Configured via IYZICO_* env vars.
 */
export class IyzicoProvider implements BillingProvider {
  private client(): Iyzipay {
    return new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY ?? "",
      secretKey: process.env.IYZICO_SECRET_KEY ?? "",
      uri: process.env.IYZICO_URI ?? "https://sandbox-api.iyzipay.com",
    });
  }

  async startCheckout(input: StartCheckoutInput): Promise<CheckoutInitResult> {
    try {
      const iyzipay = this.client();
      const result = await call<IyzicoFormResult>((cb) =>
        iyzipay.subscriptionCheckoutForm.initialize(
          {
            locale: Iyzipay.LOCALE.EN,
            conversationId: input.tenantId,
            pricingPlanReferenceCode: input.pricingPlanRef,
            subscriptionInitialStatus: "ACTIVE",
            callbackUrl: input.callbackUrl,
            customer: {
              name: input.customer.name,
              surname: input.customer.surname,
              email: input.customer.email,
              identityNumber: "11111111111",
              billingAddress: {
                contactName: input.customer.name,
                city: "Istanbul",
                country: "Turkey",
                address: "N/A",
              },
            },
          },
          cb,
        ),
      );

      if (result.status !== "success") {
        return { ok: false, error: result.errorMessage ?? "init_failed" };
      }
      return {
        ok: true,
        token: result.token,
        checkoutUrl: result.payWithIyzicoPageUrl,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }

  async verifyCheckout(token: string): Promise<CheckoutVerifyResult> {
    try {
      const iyzipay = this.client();
      const result = await call<IyzicoFormResult>((cb) =>
        iyzipay.subscriptionCheckoutForm.retrieve({ token }, cb),
      );

      const active =
        result.status === "success" &&
        (result.subscriptionStatus === "ACTIVE" ||
          result.subscriptionStatus === "TRIAL");
      return {
        ok: active,
        subscriptionRef: result.referenceCode,
        status: result.subscriptionStatus,
        error: active ? undefined : result.errorMessage ?? "not_active",
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }
}
