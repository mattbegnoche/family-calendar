import type { CalendarEvent } from "@/lib/calendar/types";

/** A local-time instant on 10 September 2026, the day most calendar tests use. */
export const TEST_DAY = new Date(2026, 8, 10);

export function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 8, day, hour, minute);
}

export function makeEvent(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    title: overrides.id,
    start: at(10, 9),
    end: at(10, 10),
    allDay: false,
    calendarId: "mom",
    color: "#0891b2",
    source: "local",
    readOnly: false,
    ...overrides,
  };
}

export function allDayEvent(id: string, firstDay: number, lastDay: number = firstDay): CalendarEvent {
  return makeEvent({
    id,
    allDay: true,
    start: new Date(2026, 8, firstDay),
    end: new Date(2026, 8, lastDay),
  });
}
