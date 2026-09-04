import "server-only";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export interface GoogleCalendarListEntry {
  id: string;
  summary?: string;
  primary?: boolean;
  selected?: boolean;
  /** owner | writer | reader | freeBusyReader */
  accessRole?: string;
}

interface CalendarListResponse {
  items?: GoogleCalendarListEntry[];
}

/**
 * Every calendar this account can see. The entry flagged `primary` carries the
 * account's own address as its `id`, which is how the settings page labels a
 * linked account — Auth.js stores no email on the Account row.
 */
export async function listGoogleCalendars(
  accessToken: string,
): Promise<GoogleCalendarListEntry[]> {
  const response = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Google calendarList failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const body = (await response.json()) as CalendarListResponse;
  return body.items ?? [];
}
