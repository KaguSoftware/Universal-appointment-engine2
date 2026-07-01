import "server-only";
import { google } from "googleapis";

// Use the OAuth client type from googleapis itself to avoid a version clash
// with the top-level google-auth-library dependency.
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export interface CalendarEvent {
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  timeZone: string;
}

export interface StoredTokens {
  access_token?: string | null;
  refresh_token: string;
  expiry?: string | null;
}

/**
 * Google Calendar adapter: OAuth handshake plus event create/delete on a
 * staff member's calendar. Implements the app's CalendarProvider role.
 */
export class GoogleCalendarProvider {
  private client(): OAuth2Client {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  /** URL to start the consent flow; `state` carries the staff id. */
  authUrl(state: string): string {
    return this.client().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state,
    });
  }

  async exchangeCode(code: string): Promise<StoredTokens> {
    const { tokens } = await this.client().getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("No refresh token returned; re-consent required.");
    }
    return {
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token,
      expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
    };
  }

  private authedClient(tokens: StoredTokens): OAuth2Client {
    const client = this.client();
    client.setCredentials({
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry ? new Date(tokens.expiry).getTime() : undefined,
    });
    return client;
  }

  async createEvent(
    tokens: StoredTokens,
    calendarId: string,
    event: CalendarEvent,
  ): Promise<string | null> {
    const calendar = google.calendar({
      version: "v3",
      auth: this.authedClient(tokens),
    });
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startISO, timeZone: event.timeZone },
        end: { dateTime: event.endISO, timeZone: event.timeZone },
      },
    });
    return res.data.id ?? null;
  }

  async deleteEvent(
    tokens: StoredTokens,
    calendarId: string,
    eventId: string,
  ): Promise<void> {
    const calendar = google.calendar({
      version: "v3",
      auth: this.authedClient(tokens),
    });
    await calendar.events.delete({ calendarId, eventId });
  }
}
