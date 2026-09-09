/**
 * Failure types for the Google Calendar integration, and the one place that
 * turns them into a sentence for the settings page or the calendar banner.
 *
 * No "server-only" here on purpose: the classes are thrown by server code, but
 * the messages are pure and unit-tested.
 */

const MAX_DETAIL_CHARS = 300;

/** A non-2xx answer from a Google API. `detail` is Google's body, truncated. */
export class GoogleApiError extends Error {
  readonly status: number;
  readonly operation: string;

  constructor(status: number, operation: string, detail: string) {
    super(`Google ${operation} failed (${status}): ${detail.slice(0, MAX_DETAIL_CHARS)}`);
    this.name = "GoogleApiError";
    this.status = status;
    this.operation = operation;
  }
}

/**
 * The linked account can no longer mint an access token: the refresh token
 * was never stored, or Google has revoked it. Signing in again does not fix
 * this — only reconnecting from Settings does.
 */
export class GoogleTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenError";
  }
}

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_MANY_REQUESTS = 429;

export const RECONNECT_HINT = "Reconnect the Google account in Settings.";

/**
 * A short, honest sentence for the person looking at the screen. The full
 * error, with Google's response body, is what callers log; none of that
 * belongs in the browser.
 */
export function describeGoogleFailure(error: unknown): string {
  if (error instanceof GoogleTokenError) {
    return `Google access has expired. ${RECONNECT_HINT}`;
  }
  if (error instanceof GoogleApiError) {
    switch (error.status) {
      case HTTP_UNAUTHORIZED:
        return `Google rejected the saved credentials. ${RECONNECT_HINT}`;
      case HTTP_FORBIDDEN:
        return "Google refused the request. Check that the Google Calendar API is enabled for this app and that the account still has access to the calendar.";
      case HTTP_NOT_FOUND:
        return "That calendar no longer exists, or is no longer shared with this account.";
      case HTTP_TOO_MANY_REQUESTS:
        return "Google is rate-limiting requests. Try again in a minute.";
      default:
        return "Google Calendar returned an error.";
    }
  }
  return "Could not reach Google Calendar.";
}
