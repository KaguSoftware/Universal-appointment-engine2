import "server-only";
import { Resend } from "resend";
import type {
  NotificationChannel,
  NotificationMessage,
  SendResult,
} from "./types";

/** Email delivery via Resend. No-ops safely when unconfigured. */
export class EmailChannel implements NotificationChannel {
  readonly kind = "email" as const;

  async send(message: NotificationMessage): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      return { ok: false, error: "email_not_configured" };
    }

    try {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
    }
  }
}
