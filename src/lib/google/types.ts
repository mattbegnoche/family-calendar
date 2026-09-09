/**
 * The slices of Google Calendar API v3 resources this app reads. Kept apart
 * from the fetch code so the pure mapper and its tests can import the shapes
 * without pulling in "server-only".
 */

/** A Google date-time is either a timed instant or an all-day calendar date. */
export interface GoogleEventDate {
  dateTime?: string;
  /** "YYYY-MM-DD", no zone. Only present on all-day events. */
  date?: string;
  timeZone?: string;
}

export interface GoogleEventAttendee {
  self?: boolean;
  /** needsAction | declined | tentative | accepted */
  responseStatus?: string;
}

export interface GoogleEvent {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  htmlLink?: string;
  /** default | outOfOffice | focusTime | workingLocation | birthday | fromGmail */
  eventType?: string;
  attendees?: GoogleEventAttendee[];
}

export interface GoogleCalendarListEntry {
  id: string;
  summary?: string;
  /** The name the user gave a calendar they don't own, e.g. a renamed subscription. */
  summaryOverride?: string;
  primary?: boolean;
  /** owner | writer | reader | freeBusyReader */
  accessRole?: string;
  deleted?: boolean;
}

// ---------------------------------------------------------------------------
// App-side views, shaped for the settings page. Defined here rather than in
// the server-only module that builds them, so client components can import
// the types without touching "server-only".
// ---------------------------------------------------------------------------

export interface GoogleCalendarOption {
  readonly id: string;
  readonly name: string;
  readonly isPrimary: boolean;
  /** owner | writer | reader */
  readonly accessRole: string;
}

/** A connected Google calendar the signed-in user may create events in. */
export interface WritableCalendarOption {
  readonly connectionId: string;
  readonly name: string;
  readonly accountEmail: string;
  /** The member whose column its events land in; the form follows it. */
  readonly memberSlug: string;
}

export interface LinkedGoogleAccount {
  readonly id: string;
  readonly email: string;
  readonly calendars: readonly GoogleCalendarOption[];
  /** Set when Google could not be reached for this account; `calendars` is then empty. */
  readonly error: string | null;
}
