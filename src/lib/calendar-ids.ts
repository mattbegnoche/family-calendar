/**
 * The calendar renders one flat list of events, so every source that lands on
 * the grid namespaces its ids: a local Event row, a Task with a due time, and
 * an event pulled from Google Calendar. The prefix is what the mutation path
 * — client hook and server action alike — uses to decide whether an edit is
 * allowed at all, so both must agree, and both read it from here.
 */

const LOCAL_EVENT_PREFIX = "event-";
const TASK_EVENT_PREFIX = "task-";
const GOOGLE_EVENT_PREFIX = "google-";
/** A row that exists only on the client while its save is in flight. */
const PENDING_EVENT_PREFIX = "pending-";

export function localEventId(eventId: string): string {
  return `${LOCAL_EVENT_PREFIX}${eventId}`;
}

export function taskEventId(taskId: string): string {
  return `${TASK_EVENT_PREFIX}${taskId}`;
}

/**
 * Two connected calendars can hold the same Google event — an invitation
 * accepted on both parents' calendars — so the connection id is part of the
 * key to keep the pair distinct on the grid.
 */
export function googleEventId(connectionId: string, googleId: string): string {
  return `${GOOGLE_EVENT_PREFIX}${connectionId}-${googleId}`;
}

export function pendingEventId(random: string): string {
  return `${PENDING_EVENT_PREFIX}${random}`;
}

/** The Event row behind a calendar id, or null for anything not stored locally. */
export function parseLocalEventId(calendarEventId: string): string | null {
  if (!calendarEventId.startsWith(LOCAL_EVENT_PREFIX)) return null;
  return calendarEventId.slice(LOCAL_EVENT_PREFIX.length);
}

export function isGoogleEventId(calendarEventId: string): boolean {
  return calendarEventId.startsWith(GOOGLE_EVENT_PREFIX);
}

export const GOOGLE_EVENT_READ_ONLY_MESSAGE =
  "Events from Google Calendar are read-only here for now. Change them in Google Calendar.";

/**
 * Why an id cannot be edited on the calendar, phrased for the person who just
 * tried — or null when it can. Local events are the only editable kind.
 */
export function readOnlyReason(calendarEventId: string): string | null {
  if (calendarEventId.startsWith(LOCAL_EVENT_PREFIX)) return null;
  if (calendarEventId.startsWith(GOOGLE_EVENT_PREFIX)) return GOOGLE_EVENT_READ_ONLY_MESSAGE;
  if (calendarEventId.startsWith(TASK_EVENT_PREFIX)) {
    return "Tasks are edited from the Tasks page.";
  }
  if (calendarEventId.startsWith(PENDING_EVENT_PREFIX)) {
    return "That event is still saving. Try again in a moment.";
  }
  return "This event can't be edited here.";
}
