import "server-only";

import { googleCalendarGet } from "@/lib/google/api";
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
