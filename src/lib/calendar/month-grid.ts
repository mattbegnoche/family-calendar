import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { CalendarEvent } from "@/lib/calendar/types";

/** Monday, matching the week view and the existing startOfWeek in src/lib/dates.ts. */
export const WEEK_STARTS_ON = 1;
export const DAYS_PER_WEEK = 7;

/** Every day the month grid shows: whole weeks from the first to the last of the month. */
export function monthGridDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
  });
}

export function chunkWeeks(days: readonly Date[]): Date[][] {
  return Array.from({ length: Math.ceil(days.length / DAYS_PER_WEEK) }, (_, week) =>
    days.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
  );
}

/**
 * The last calendar day an event touches.
 *
 * A timed event ending exactly at midnight belongs to the day before: a 9 pm
 * to midnight film is not a two-day event. All-day events already end at
 * midnight on their last day (see CalendarEvent.end).
 */
export function lastDayOf(event: CalendarEvent): Date {
  const start = startOfDay(event.start);
  if (event.allDay) return event.end < event.start ? start : startOfDay(event.end);

  const endDay = startOfDay(event.end);
  const endsOnMidnight = event.end.getTime() === endDay.getTime();
  const lastDay = endsOnMidnight && event.end > event.start ? addDays(endDay, -1) : endDay;
  return lastDay < start ? start : lastDay;
}

export function spansMultipleDays(event: CalendarEvent): boolean {
  return differenceInCalendarDays(lastDayOf(event), startOfDay(event.start)) > 0;
}

/** True when `day` is one of the days the event touches. */
export function touchesDay(event: CalendarEvent, day: Date): boolean {
  const target = startOfDay(day);
  return startOfDay(event.start) <= target && target <= lastDayOf(event);
}

export function byStart(a: CalendarEvent, b: CalendarEvent): number {
  return a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title);
}

/** A bar across one week row: all-day events, and timed events that cross midnight. */
export interface WeekSegment {
  readonly event: CalendarEvent;
  /** Zero-based column of the bar's first day within the row. */
  readonly startCol: number;
  readonly span: number;
  readonly continuesBefore: boolean;
  readonly continuesAfter: boolean;
  /** Vertical slot; overlapping bars take successive lanes. */
  readonly lane: number;
}

type UnlanedSegment = Omit<WeekSegment, "lane">;

function segmentFor(event: CalendarEvent, weekStart: Date, weekEnd: Date): UnlanedSegment | null {
  const first = startOfDay(event.start);
  const last = lastDayOf(event);
  if (last < weekStart || first > weekEnd) return null;

  const startCol = Math.max(0, differenceInCalendarDays(first, weekStart));
  const endCol = Math.min(DAYS_PER_WEEK - 1, differenceInCalendarDays(last, weekStart));
  return {
    event,
    startCol,
    span: endCol - startCol + 1,
    continuesBefore: first < weekStart,
    continuesAfter: last > weekEnd,
  };
}

function assignLanes(segments: readonly UnlanedSegment[]): WeekSegment[] {
  const { placed } = segments.reduce<{ placed: WeekSegment[]; laneEnds: number[] }>(
    ({ placed, laneEnds }, segment) => {
      const freeLane = laneEnds.findIndex((end) => end < segment.startCol);
      const lane = freeLane === -1 ? laneEnds.length : freeLane;
      const nextLaneEnds = [...laneEnds];
      nextLaneEnds[lane] = segment.startCol + segment.span - 1;
      return { placed: [...placed, { ...segment, lane }], laneEnds: nextLaneEnds };
    },
    { placed: [], laneEnds: [] },
  );
  return placed;
}

/**
 * Bars for one week row, longest-first within a start day so the lane packing
 * stays tidy, then stacked into lanes where they overlap.
 */
export function layoutWeekSegments(
  events: readonly CalendarEvent[],
  weekDays: readonly Date[],
): WeekSegment[] {
  if (weekDays.length === 0) return [];
  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = startOfDay(weekDays[weekDays.length - 1]);

  const segments = events
    .filter((event) => event.allDay || spansMultipleDays(event))
    .flatMap((event) => {
      const segment = segmentFor(event, weekStart, weekEnd);
      return segment ? [segment] : [];
    })
    .sort(
      (a, b) =>
        a.startCol - b.startCol || b.span - a.span || byStart(a.event, b.event),
    );

  return assignLanes(segments);
}

/** Timed, single-day events on `day`: the ones a month cell lists as chips. */
export function timedEventsOnDay(events: readonly CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((event) => !event.allDay && !spansMultipleDays(event) && isSameDay(event.start, day))
    .sort(byStart);
}
