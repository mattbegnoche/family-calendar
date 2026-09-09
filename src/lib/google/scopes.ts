/**
 * Google OAuth scopes.
 *
 * Sign-in requests only the OpenID defaults, so someone creating a family is
 * never asked for calendar access they may not want to grant. Calendar scopes
 * are requested later, from Settings, by whoever chooses to connect one — with
 * `prompt=consent` and `access_type=offline` so Google issues the refresh token
 * the server needs once the hour-long access token has expired.
 *
 * Both scopes are read-only. Editing Google events from here is a later step,
 * and when it comes it will need `calendar.events` instead, which means every
 * connected account reconsents once. Asking for write access now, for a view
 * that never writes, would be over-asking.
 */

/** Read events on any calendar the account can see. Nothing here can write. */
export const GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.events.readonly";

/**
 * Needed separately: the events scope does not permit listing which calendars
 * the account has, and the picker in Settings has to show that list.
 */
export const GOOGLE_CALENDAR_LIST_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly";

export const GOOGLE_CALENDAR_SCOPES: readonly string[] = [
  GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE,
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

/**
 * Whether a stored Account.scope — Google's space-separated grant list — covers
 * everything the calendar import needs. A plain sign-in account fails this and
 * stays out of the connect picker until its owner grants access.
 */
export function hasGoogleCalendarScope(granted: string | null | undefined): boolean {
  if (!granted) return false;
  const scopes = new Set(granted.split(/\s+/).filter(Boolean));
  return GOOGLE_CALENDAR_SCOPES.every((scope) => scopes.has(scope));
}
