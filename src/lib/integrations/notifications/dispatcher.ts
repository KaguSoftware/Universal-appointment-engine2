import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tenantAllows } from "@/lib/feature-gate";
import type { Tenant } from "@/lib/types";
import { resolveTerminology } from "@/lib/verticals";
import { EmailChannel } from "./email-channel";
import { SmsChannel } from "./sms-channel";
import { buildMessage } from "./templates";
import type { NotificationChannel, NotificationType } from "./types";

export interface DispatchInput {
  tenant: Tenant;
  appointmentId: string;
  serviceName: string;
  startAt: Date;
  email?: string | null;
  phone?: string | null;
  /** Account-less management link, included in emails when present. */
  manageUrl?: string | null;
  type: NotificationType;
}

/**
 * Sends a notification across the channels allowed for the tenant's plan,
 * recording each attempt in notifications_log for idempotency and audit.
 */
export class NotificationDispatcher {
  private readonly db = createSupabaseAdminClient();
  private readonly email = new EmailChannel();
  private readonly sms = new SmsChannel();

  async dispatch(input: DispatchInput): Promise<void> {
    const terms = resolveTerminology(input.tenant);
    const channels = this.channelsFor(input);

    for (const { channel, to } of channels) {
      if (await this.alreadySent(input.appointmentId, channel.kind, input.type)) {
        continue;
      }
      const message = buildMessage(input.type, {
        tenant: input.tenant,
        terms,
        serviceName: input.serviceName,
        startAt: input.startAt,
        to,
        // Only surface the manage link over email (channel.kind === 'email').
        manageUrl: channel.kind === "email" ? (input.manageUrl ?? null) : null,
      });
      const result = await channel.send(message);
      await this.log(input, channel.kind, result.ok ? "sent" : "failed");
    }
  }

  /** Resolves which channels apply given the plan and available contact info. */
  private channelsFor(
    input: DispatchInput,
  ): { channel: NotificationChannel; to: string }[] {
    const out: { channel: NotificationChannel; to: string }[] = [];

    // Email: confirmations/cancellations for all; reminders need the Pro flag.
    const emailAllowed =
      input.type !== "reminder" ||
      tenantAllows(input.tenant, "email_reminders");
    if (input.email && emailAllowed) {
      out.push({ channel: this.email, to: input.email });
    }

    // SMS is a Pro feature across the board.
    if (input.phone && tenantAllows(input.tenant, "sms_reminders")) {
      out.push({ channel: this.sms, to: input.phone });
    }

    return out;
  }

  private async alreadySent(
    appointmentId: string,
    channel: string,
    type: NotificationType,
  ): Promise<boolean> {
    const { data } = await this.db
      .from("notifications_log")
      .select("id")
      .eq("appointment_id", appointmentId)
      .eq("channel", channel)
      .eq("type", type)
      .eq("status", "sent")
      .maybeSingle();
    return Boolean(data);
  }

  private async log(
    input: DispatchInput,
    channel: string,
    status: string,
  ): Promise<void> {
    await this.db.from("notifications_log").upsert(
      {
        tenant_id: input.tenant.id,
        appointment_id: input.appointmentId,
        channel,
        type: input.type,
        status,
      },
      { onConflict: "appointment_id,channel,type" },
    );
  }
}
