import type { Tenant, Terminology } from "@/lib/types";
import type { NotificationMessage, NotificationType } from "./types";

export interface TemplateContext {
  tenant: Tenant;
  terms: Terminology;
  serviceName: string;
  startAt: Date;
  to: string;
  /** Account-less manage link; appended to email bodies when present. */
  manageUrl?: string | null;
}

/** Appends a "manage your booking" line when a link is available. */
function withManageLink(body: string, manageUrl?: string | null): string {
  if (!manageUrl) return body;
  return `${body}\n\nView, reschedule or cancel your booking: ${manageUrl}`;
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
        body: withManageLink(
          `Your ${appt} for ${ctx.serviceName} is confirmed for ${when}.`,
          ctx.manageUrl,
        ),
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
        body: withManageLink(
          `Reminder — your ${appt} for ${ctx.serviceName} is on ${when}.`,
          ctx.manageUrl,
        ),
      };
  }
}
