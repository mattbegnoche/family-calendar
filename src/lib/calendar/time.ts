import { addDays, isSameDay, startOfDay } from "date-fns";

/**
 * Wall-clock arithmetic for the time grid.
 *
 * Everything here works in "minutes since midnight" read off the clock, not
 * elapsed milliseconds: on the day the clocks change, 3 pm must still sit on
 * the 3 pm row, and elapsed time since midnight would put it an hour off.
 */

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

/** Drag, resize and click-to-create all land on this grid. */
export const SNAP_MINUTES = 15;
/** Shortest block the grid draws, so a zero-length event is still clickable. */
export const MIN_EVENT_MINUTES = 15;
export const DEFAULT_EVENT_MINUTES = 60;

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}

export function clampMinutes(minutes: number): number {
  return Math.min(MINUTES_PER_DAY, Math.max(0, minutes));
}

export function snapMinutes(minutes: number, step: number = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/** The wall-clock instant `minutes` after midnight on `day`. 1440 rolls into the next day. */
export function atMinutes(day: Date, minutes: number): Date {
  const clamped = clampMinutes(minutes);
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(clamped / MINUTES_PER_HOUR),
    clamped % MINUTES_PER_HOUR,
    0,
    0,
  );
}

export interface DaySlice {
  readonly startMinutes: number;
  readonly endMinutes: number;
}

/**
 * The part of [start, end) that falls on `day`, as wall-clock minutes, or
 * null when none does. An event that runs past midnight is clipped to 1440,
 * so a late show is drawn to the bottom of its day and again from the top of
 * the next. A zero-length event on the day still yields a minimum block.
 */
export function sliceOnDay(start: Date, end: Date, day: Date): DaySlice | null {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const isInstant = start.getTime() === end.getTime();

  const overlaps = isInstant
    ? isSameDay(start, day)
    : start < dayEnd && end > dayStart;
  if (!overlaps) return null;

  const startMinutes = start < dayStart ? 0 : minutesSinceMidnight(start);
  const endMinutes = end >= dayEnd ? MINUTES_PER_DAY : minutesSinceMidnight(end);
  return {
    startMinutes,
    endMinutes: Math.max(endMinutes, startMinutes + MIN_EVENT_MINUTES),
  };
}
