import { googleEventId } from "@/lib/calendar-ids";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { GoogleEvent } from "@/lib/google/types";
import { zonedMidnight } from "@/lib/time-zones";

/**
 * Google event → CalendarEvent. Pure: no fetch, no Prisma, so the date edge
 * cases below are covered by unit tests rather than by squinting at the grid.
 */

const UNTITLED_EVENT = "(no title)";
/** Google's daily "Home" / "Office" markers — noise on a family wall display. */
const WORKING_LOCATION_EVENT_TYPE = "workingLocation";
const DECLINED = "declined";

export interface ImportTarget {
  readonly connectionId: string;
  /** Google's name for the calendar; shown on the details card. */
  readonly calendarName: string;
  /** The column imported events land in, and the colour they take. */
  readonly member: { readonly slug: string; readonly color: string };
  /** Household.timeZone: where Google's zone-less all-day dates are anchored. */
  readonly timeZone: string;
}

function isDeclinedBySelf(event: GoogleEvent): boolean {
  return (
    event.attendees?.some(
      (attendee) => attendee.self && attendee.responseStatus === DECLINED,
    ) ?? false
  );
}

/**
 * Cancelled events are Google's tombstones, not things to draw. Declined
 * invitations and working-location markers are hidden for the same reason
 * Google's own UI hides them by default.
 */
function shouldImport(event: GoogleEvent): boolean {
  if (event.status === "cancelled") return false;
  if (event.eventType === WORKING_LOCATION_EVENT_TYPE) return false;
  return !isDeclinedBySelf(event);
}

/** "2026-03-09" → "2026-03-08". Calendar-date arithmetic, so DST cannot leak in. */
function previousCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

interface EventSpan {
  readonly start: Date;
  readonly end: Date;
  readonly allDay: boolean;
}

function allDaySpan(startDate: string, endDate: string | undefined, timeZone: string): EventSpan {
  const start = zonedMidnight(startDate, timeZone);
  // Google's all-day `end.date` is EXCLUSIVE — a one-day event on the 4th
  // ends on the 5th — while CalendarEvent.end for an all-day event is midnight
  // on its LAST day. Step the date back before anchoring it, so the step is a
  // whole calendar day even across a clock change.
  const end = endDate ? zonedMidnight(previousCalendarDate(endDate), timeZone) : start;
  return { start, end: end < start ? start : end, allDay: true };
}

function spanOf(event: GoogleEvent, timeZone: string): EventSpan | null {
  try {
    if (event.start?.date) {
      return allDaySpan(event.start.date, event.end?.date, timeZone);
    }
    if (!event.start?.dateTime || !event.end?.dateTime) return null;

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end, allDay: false };
  } catch {
    // zonedMidnight refuses a malformed date; skip that one event rather than
    // fail the whole calendar.
    return null;
  }
}

export function toCalendarEvent(event: GoogleEvent, target: ImportTarget): CalendarEvent | null {
  if (!shouldImport(event)) return null;
  const span = spanOf(event, target.timeZone);
  if (!span) return null;

  return {
    id: googleEventId(target.connectionId, event.id),
    title: event.summary?.trim() || UNTITLED_EVENT,
    description: event.description,
    location: event.location,
    ...span,
    calendarId: target.member.slug,
    color: target.member.color,
    source: "google",
    sourceLabel: target.calendarName,
    htmlLink: event.htmlLink,
    // View-only for now. Editing Google events needs the write scope and a
    // write-back path; until then the grid refuses to move or edit these.
    readOnly: true,
  };
}

export function toCalendarEvents(
  events: readonly GoogleEvent[],
  target: ImportTarget,
): CalendarEvent[] {
  return events
    .map((event) => toCalendarEvent(event, target))
    .filter((event): event is CalendarEvent => event !== null);
}
