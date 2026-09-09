import "server-only";

import { googleCalendarGet, googleCalendarRequest } from "@/lib/google/api";
import { GoogleApiError } from "@/lib/google/errors";
import type { GoogleEventPatch } from "@/lib/google/event-patch";
import type { GoogleEvent } from "@/lib/google/types";

interface EventsListResponse {
  items?: GoogleEvent[];
  nextPageToken?: string;
}

const MAX_RESULTS_PER_PAGE = 2500;
/** Guards against an unbounded loop if Google keeps handing back page tokens. */
const MAX_PAGES = 10;

export interface ListGoogleEventsOptions {
  accessToken: string;
  calendarId: string;
  timeMin: Date;
  timeMax: Date;
}

/**
 * Events in a window, with recurrences already expanded by Google.
 *
 * `singleEvents=true` is what keeps RRULE handling out of this codebase:
 * Google returns flat occurrences rather than a rule to expand. It is mutually
 * exclusive with `syncToken`, so incremental sync — if it ever comes — is a
 * separate strategy, not an addition to this one.
 */
export async function listGoogleEvents({
  accessToken,
  calendarId,
  timeMin,
  timeMax,
}: ListGoogleEventsOptions): Promise<GoogleEvent[]> {
  const path = `/calendars/${encodeURIComponent(calendarId)}/events`;
  const collected: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    const body = await googleCalendarGet<EventsListResponse>(
      accessToken,
      path,
      {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: String(MAX_RESULTS_PER_PAGE),
        ...(pageToken ? { pageToken } : {}),
      },
      "events.list",
    );
    collected.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
    page += 1;
  } while (pageToken && page < MAX_PAGES);

  return collected;
}

/**
 * Nobody outside the family is emailed about a change made here: this is a
 * household display, not a scheduling tool for the event's guests.
 */
const NO_NOTIFICATIONS = { sendUpdates: "none" };

/** Create one event. Google answers with the event as stored, id included. */
export async function insertGoogleEvent(
  accessToken: string,
  calendarId: string,
  body: GoogleEventPatch,
): Promise<GoogleEvent> {
  const response = await googleCalendarRequest(
    accessToken,
    "POST",
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    NO_NOTIFICATIONS,
    body,
    "events.insert",
  );
  return (await response.json()) as GoogleEvent;
}

function eventPath(calendarId: string, eventId: string): string {
  return `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
}

/**
 * Change part of one event. On an instance id of a repeating event this
 * changes that occurrence alone, which Google records as an exception.
 */
export async function patchGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  patch: GoogleEventPatch,
): Promise<void> {
  await googleCalendarRequest(
    accessToken,
    "PATCH",
    eventPath(calendarId, eventId),
    NO_NOTIFICATIONS,
    patch,
    "events.patch",
  );
}

const HTTP_GONE = 410;

/** Delete one event. Already gone counts as done. */
export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  try {
    await googleCalendarRequest(
      accessToken,
      "DELETE",
      eventPath(calendarId, eventId),
      NO_NOTIFICATIONS,
      undefined,
      "events.delete",
    );
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === HTTP_GONE) return;
    throw error;
  }
}
