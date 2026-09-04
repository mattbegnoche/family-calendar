import "server-only";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const MAX_RESULTS_PER_PAGE = 2500;

/** Guards against an unbounded loop if Google keeps handing back page tokens. */
const MAX_PAGES = 10;

/** A Google date-time is either a timed instant or an all-day calendar date. */
export interface GoogleEventDate {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface GoogleEvent {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  etag?: string;
  updated?: string;
  htmlLink?: string;
  recurringEventId?: string;
}

interface EventsListResponse {
  items?: GoogleEvent[];
  nextPageToken?: string;
}

export interface ListEventsOptions {
  accessToken: string;
  calendarId?: string;
  timeMin: Date;
  timeMax: Date;
}

/**
 * Events in a window, with recurrences already expanded by Google.
 *
 * `singleEvents=true` is what keeps RRULE handling out of this codebase: Google
 * returns flat occurrences rather than a rule to expand. Note it is mutually
 * exclusive with `syncToken`, so incremental sync is a separate strategy, not
 * an addition to this one.
 */
export async function listGoogleEvents({
  accessToken,
  calendarId = "primary",
  timeMin,
  timeMax,
}: ListEventsOptions): Promise<GoogleEvent[]> {
  const collected: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(MAX_RESULTS_PER_PAGE),
    });
    if (pageToken) params.set("pageToken", pageToken);

    const url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Google events.list failed (${response.status}): ${detail.slice(0, 300)}`,
      );
    }

    const body = (await response.json()) as EventsListResponse;
    collected.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
    page += 1;
  } while (pageToken && page < MAX_PAGES);

  return collected;
}
