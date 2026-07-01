import type { Tenant, Terminology } from "@/lib/types";
import type { NotificationMessage, NotificationType } from "./types";

export interface TemplateContext {
  tenant: Tenant;
  terms: Terminology;
  serviceName: string;
  startAt: Date;
  to: string;
}

function formatWhen(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

/** Builds the subject/body for a given notification type. */
export function buildMessage(
  type: NotificationType,
  ctx: TemplateContext,
): NotificationMessage {
  const when = formatWhen(ctx.startAt, ctx.tenant.timezone);
  const appt = ctx.terms.appointment.toLowerCase();

  switch (type) {
    case "confirmation":
      return {
        to: ctx.to,
        subject: `Your ${appt} at ${ctx.tenant.name} is confirmed`,
        body: `Your ${appt} for ${ctx.serviceName} is confirmed for ${when}.`,
      };
    case "cancellation":
      return {
        to: ctx.to,
        subject: `Your ${appt} at ${ctx.tenant.name} was cancelled`,
        body: `Your ${appt} for ${ctx.serviceName} on ${when} has been cancelled.`,
      };
    case "reminder":
      return {
        to: ctx.to,
        subject: `Reminder: ${appt} at ${ctx.tenant.name}`,
        body: `Reminder — your ${appt} for ${ctx.serviceName} is on ${when}.`,
      };
  }
}
