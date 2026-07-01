export type NotificationType = "confirmation" | "cancellation" | "reminder";

export interface NotificationMessage {
  to: string; // email or phone depending on channel
  subject: string;
  body: string; // plain-text body (email also renders it as text)
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** A delivery channel for transactional notifications (email, SMS, ...). */
export interface NotificationChannel {
  readonly kind: "email" | "sms";
  send(message: NotificationMessage): Promise<SendResult>;
}
