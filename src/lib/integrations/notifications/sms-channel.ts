import "server-only";
import twilio from "twilio";
import type {
  NotificationChannel,
  NotificationMessage,
  SendResult,
} from "./types";

/** SMS delivery via Twilio (a Pro-plan feature). No-ops when unconfigured. */
export class SmsChannel implements NotificationChannel {
  readonly kind = "sms" as const;

  async send(message: NotificationMessage): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) {
      return { ok: false, error: "sms_not_configured" };
    }

    try {
      const client = twilio(sid, token);
      await client.messages.create({ from, to: message.to, body: message.body });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
    }
  }
}
