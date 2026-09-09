/**
 * Google OAuth scopes.
 *
 * Sign-in requests only the OpenID defaults, so someone creating a family is
 * never asked for calendar access they may not want to grant. Calendar scopes
 * are requested later, from Settings, by whoever chooses to connect one — with
 * `prompt=consent` and `access_type=offline` so Google issues the refresh token
 * the server needs once the hour-long access token has expired.
 *
 * The events scope is read AND write: whoever connected a calendar can edit
 * its events from here. Accounts that granted only the earlier read-only
 * scope keep working for reading and are read-only until reconnected once.
 */

/** Read and write events on any calendar the account can see. */
export const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/** What the app asked for before editing existed; still enough to read. */
export const GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";

/**
 * Needed separately: the events scope does not permit listing which calendars
 * the account has, and the picker in Settings has to show that list.
 */
export const GOOGLE_CALENDAR_LIST_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly";

/** What a connect asks for today. */
export const GOOGLE_CALENDAR_SCOPES: readonly string[] = [
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_LIST_READONLY_SCOPE,
];

/**
 * The provider's defaults, repeated here because a `scope` parameter replaces
 * them rather than adding to them — dropping `openid` would break the OIDC
 * flow the connect step still rides on.
 */
const GOOGLE_SIGN_IN_SCOPES: readonly string[] = ["openid", "email", "profile"];

/** The `scope` parameter for the connect-a-calendar authorization request. */
export function googleCalendarAuthorizationScope(): string {
  return [...GOOGLE_SIGN_IN_SCOPES, ...GOOGLE_CALENDAR_SCOPES].join(" ");
}

function grantedScopes(granted: string | null | undefined): ReadonlySet<string> {
  return new Set((granted ?? "").split(/\s+/).filter(Boolean));
}

/**
 * Whether a stored Account.scope — Google's space-separated grant list — is
 * enough to READ calendars: the calendar list plus either events scope. A
 * plain sign-in account fails this and stays out of the connect picker.
 */
export function hasGoogleCalendarScope(granted: string | null | undefined): boolean {
  const scopes = grantedScopes(granted);
  return (
    scopes.has(GOOGLE_CALENDAR_LIST_READONLY_SCOPE) &&
    (scopes.has(GOOGLE_CALENDAR_EVENTS_SCOPE) || scopes.has(GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE))
  );
}

/** Whether the account may also change events: only the read-write scope will do. */
export function hasGoogleCalendarWriteScope(granted: string | null | undefined): boolean {
  return grantedScopes(granted).has(GOOGLE_CALENDAR_EVENTS_SCOPE);
}
