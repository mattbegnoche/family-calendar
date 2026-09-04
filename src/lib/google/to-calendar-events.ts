import type { CalendarEvent } from "calendarkit-pro";

import { memberColor } from "@/lib/family";
import type { GoogleEvent } from "@/lib/google/calendar";

/**
 * TODO: replace with CalendarConnection.memberId once the domain models come
 * back. Until then every imported event lands in one member's column.
 */
const IMPORT_MEMBER_ID = "dad";

const UNTITLED_EVENT = "(no title)";

/**
 * Google all-day dates are plain "YYYY-MM-DD" calendar dates with no zone.
 * `new Date("2026-09-04")` parses that as UTC midnight, which renders as the
 * 3rd anywhere west of Greenwich — so build the date from parts instead, which
 * yields local midnight and keeps the event on the day Google meant.
 */
function parseAllDayDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toCalendarEvent(event: GoogleEvent): CalendarEvent | null {
  const isAllDay = Boolean(event.start?.date);

  let start: Date;
  let end: Date;

  if (isAllDay) {
    if (!event.start?.date) return null;
    start = parseAllDayDate(event.start.date);
    // Google's all-day `end.date` is EXCLUSIVE — a single-day event on the 4th
    // ends on the 5th. Step back a day so it doesn't render one day too long.
    end = event.end?.date
      ? new Date(parseAllDayDate(event.end.date).getTime() - MS_PER_DAY)
      : start;
  } else {
    if (!event.start?.dateTime || !event.end?.dateTime) return null;
    start = new Date(event.start.dateTime);
    end = new Date(event.end.dateTime);
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  return {
    id: `google-${event.id}`,
    title: event.summary?.trim() || UNTITLED_EVENT,
    description: event.description,
    location: event.location,
    start,
    end,
    allDay: isAllDay,
    calendarId: IMPORT_MEMBER_ID,
    resourceId: IMPORT_MEMBER_ID,
    color: memberColor(IMPORT_MEMBER_ID),
    source: "google",
  };
}

/** Cancelled events are Google's tombstones, not things to draw. */
export function toCalendarEvents(events: readonly GoogleEvent[]): CalendarEvent[] {
  return events
    .filter((event) => event.status !== "cancelled")
    .map(toCalendarEvent)
    .filter((event): event is CalendarEvent => event !== null);
}
