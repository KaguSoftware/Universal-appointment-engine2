declare module "iyzipay" {
  interface IyzipayOptions {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  type Callback<T = unknown> = (err: unknown, result: T) => void;

  interface CallbackApi {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialize(request: any, cb: Callback<any>): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    retrieve(request: any, cb: Callback<any>): void;
  }

  class Iyzipay {
    constructor(options: IyzipayOptions);
    subscriptionCheckoutForm: CallbackApi;
    static LOCALE: { TR: string; EN: string };
    static CURRENCY: Record<string, string>;
  }

  export default Iyzipay;
}
