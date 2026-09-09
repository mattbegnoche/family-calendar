/**
 * The calendar's own event model. Nothing here knows about Prisma, Google, or
 * the grid components: the adapters in src/lib/adapters/calendar.ts map rows
 * into this shape, and the components render it.
 */

export type CalendarView = "month" | "week" | "day" | "agenda" | "resource";

export const CALENDAR_VIEWS: readonly CalendarView[] = [
  "month",
  "week",
  "day",
  "agenda",
  "resource",
];

export const CALENDAR_VIEW_LABELS: Record<CalendarView, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
  agenda: "Agenda",
  resource: "People",
};

export function isCalendarView(value: unknown): value is CalendarView {
  return typeof value === "string" && (CALENDAR_VIEWS as readonly string[]).includes(value);
}

/** Where an event came from. Decides whether it can be edited and how it is drawn. */
export type EventSource = "local" | "task" | "google";

export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly start: Date;
  /**
   * Exclusive for timed events. All-day events end at midnight on their LAST
   * day, so a one-day all-day event has start === end.
   */
  readonly end: Date;
  readonly allDay: boolean;
  /** The member (by slug) whose toggle and resource column this event belongs to. */
  readonly calendarId: string;
  /** 6-digit hex. */
  readonly color: string;
  readonly description?: string;
  readonly location?: string;
  readonly source: EventSource;
  /** e.g. the Google calendar's name; shown on the details card. */
  readonly sourceLabel?: string;
  /** Deep link to the event at its source, when it has one. */
  readonly htmlLink?: string;
  /** Read-only events open a details card, not the editor, and refuse drag and resize. */
  readonly readOnly: boolean;
}

/** A member, as a toggleable calendar and as a column in the People view. */
export interface CalendarSource {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

/** What the editor hands back: enough to create a row, or to overwrite one. */
export interface EventDraft {
  readonly title: string;
  readonly start: Date;
  readonly end: Date;
  readonly allDay: boolean;
  readonly calendarId: string;
  readonly description?: string;
  readonly location?: string;
}

export interface DateRange {
  readonly from: Date;
  /** Exclusive. */
  readonly to: Date;
}
