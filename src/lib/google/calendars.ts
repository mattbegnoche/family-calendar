import "server-only";

import { googleCalendarGet } from "@/lib/google/api";
import type { GoogleCalendarListEntry } from "@/lib/google/types";

interface CalendarListResponse {
  items?: GoogleCalendarListEntry[];
}

/** Google's page maximum. A family account is nowhere near it, so no paging. */
const MAX_CALENDARS = 250;

/**
 * Every calendar this account can see. The entry flagged `primary` carries
 * the account's own address as its `id`, which is how the settings page
 * labels a linked account — Auth.js stores no email on the Account row.
 */
export async function listGoogleCalendars(
  accessToken: string,
): Promise<GoogleCalendarListEntry[]> {
  const body = await googleCalendarGet<CalendarListResponse>(
    accessToken,
    "/users/me/calendarList",
    { maxResults: String(MAX_CALENDARS), showDeleted: "false" },
    "calendarList",
  );
  return (body.items ?? []).filter((entry) => !entry.deleted);
}
