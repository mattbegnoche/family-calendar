import type { DateRange } from "@/lib/calendar/types";
import { wallClockIn, zonedDateTime, type WallClock } from "@/lib/time-zones";

/**
 * Repeating tasks.
 *
 * A rule is expanded on demand into the occurrences that fall inside a window,
 * in WALL-CLOCK terms in the household's zone: "every day at 7:00" stays 7:00
 * across a clock change, and "the 15th of every month" is the 15th on the
 * family's calendar, not UTC's. Nothing here touches the database, so every
 * edge case below is covered by test/task-recurrence.test.ts.
 */

export const REPEAT_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
export type RepeatFrequency = (typeof REPEAT_FREQUENCIES)[number];

export const REPEAT_FREQUENCY_LABEL: Record<RepeatFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

/** Unit noun for "every N …". */
const REPEAT_UNIT: Record<RepeatFrequency, string> = {
  DAILY: "day",
  WEEKLY: "week",
  MONTHLY: "month",
  YEARLY: "year",
};

export function isRepeatFrequency(value: unknown): value is RepeatFrequency {
  return typeof value === "string" && (REPEAT_FREQUENCIES as readonly string[]).includes(value);
}

export interface RepeatRule {
  readonly frequency: RepeatFrequency;
  /** Every N units. */
  readonly interval: number;
  /** WEEKLY only: JavaScript getDay() numbers, 0 = Sunday. Empty means the anchor's weekday. */
  readonly weekdays: readonly number[];
  /** Last day an occurrence may fall on, inclusive. Null repeats forever. */
  readonly until: Date | null;
}

export const MAX_REPEAT_INTERVAL = 99;
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Hard ceilings so a malformed rule can never spin. */
const MAX_OCCURRENCES = 1000;
const MAX_STEPS = 10_000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

export function isWeekday(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < DAYS_PER_WEEK;
}

/** Sorted, de-duplicated, valid weekdays; the anchor's own weekday when none are given. */
export function effectiveWeekdays(weekdays: readonly number[], anchorWeekday: number): number[] {
  const valid = [...new Set(weekdays.filter(isWeekday))].sort((a, b) => a - b);
  return valid.length > 0 ? valid : [anchorWeekday];
}

// ---------------------------------------------------------------------------
// Calendar-date arithmetic. A "day number" is Date.UTC(y, m-1, d) / MS_PER_DAY:
// whole days on a proleptic calendar with no zones and no DST in sight.
// ---------------------------------------------------------------------------

interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function dayNumber(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / MS_PER_DAY;
}

function fromDayNumber(days: number): CalendarDate {
  const date = new Date(days * MS_PER_DAY);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function weekdayOf(date: CalendarDate): number {
  return new Date(dayNumber(date) * MS_PER_DAY).getUTCDay();
}

/** The same day-of-month `months` later, or null when that month is too short. */
function addMonthsKeepingDay(date: CalendarDate, months: number): CalendarDate | null {
  const shifted = new Date(Date.UTC(date.year, date.month - 1 + months, date.day));
  if (shifted.getUTCDate() !== date.day) return null;
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: date.day };
}

function compareDates(a: CalendarDate, b: CalendarDate): number {
  return dayNumber(a) - dayNumber(b);
}

// ---------------------------------------------------------------------------
// Candidate dates per frequency, as lazy sequences, so the caller can stop as
// soon as it passes the window without generating years it will not use.
// ---------------------------------------------------------------------------

function* dailyDates(anchor: CalendarDate, interval: number, firstDay: number): Generator<CalendarDate> {
  const start = dayNumber(anchor);
  const step = interval;
  // Jump straight to the first repetition that could reach the window.
  const firstIndex = Math.max(0, Math.floor((firstDay - start) / step));
  for (let index = firstIndex; index < MAX_STEPS; index += 1) {
    yield fromDayNumber(start + index * step);
  }
}

function* weeklyDates(
  anchor: CalendarDate,
  interval: number,
  weekdays: readonly number[],
  firstDay: number,
): Generator<CalendarDate> {
  const anchorDay = dayNumber(anchor);
  // Weeks run Monday to Sunday, as everywhere else in the app.
  const weekStart = anchorDay - ((weekdayOf(anchor) + 6) % DAYS_PER_WEEK);
  const step = interval * DAYS_PER_WEEK;
  const firstIndex = Math.max(0, Math.floor((firstDay - weekStart) / step) - 1);
  for (let index = firstIndex; index < MAX_STEPS; index += 1) {
    const base = weekStart + index * step;
    for (const weekday of weekdays) {
      const day = base + ((weekday + 6) % DAYS_PER_WEEK);
      if (day >= anchorDay) yield fromDayNumber(day);
    }
  }
}

function* monthlyDates(anchor: CalendarDate, interval: number, first: CalendarDate): Generator<CalendarDate> {
  const monthsAhead = (first.year - anchor.year) * 12 + (first.month - anchor.month);
  const firstIndex = Math.max(0, Math.floor(monthsAhead / interval) - 1);
  for (let index = firstIndex; index < MAX_STEPS; index += 1) {
    const candidate = addMonthsKeepingDay(anchor, index * interval);
    // A 31st has no home in a 30-day month; that month is skipped, not clamped.
    if (candidate) yield candidate;
  }
}

function* yearlyDates(anchor: CalendarDate, interval: number, first: CalendarDate): Generator<CalendarDate> {
  const firstIndex = Math.max(0, Math.floor((first.year - anchor.year) / interval) - 1);
  for (let index = firstIndex; index < MAX_STEPS; index += 1) {
    const candidate = addMonthsKeepingDay(anchor, index * interval * 12);
    if (candidate) yield candidate;
  }
}

function candidateDates(
  anchor: CalendarDate,
  rule: RepeatRule,
  first: CalendarDate,
): Generator<CalendarDate> {
  const interval = Math.max(1, Math.min(MAX_REPEAT_INTERVAL, Math.floor(rule.interval)));
  switch (rule.frequency) {
    case "DAILY":
      return dailyDates(anchor, interval, dayNumber(first));
    case "WEEKLY":
      return weeklyDates(anchor, interval, effectiveWeekdays(rule.weekdays, weekdayOf(anchor)), dayNumber(first));
    case "MONTHLY":
      return monthlyDates(anchor, interval, first);
    case "YEARLY":
      return yearlyDates(anchor, interval, first);
  }
}

function dateOf(clock: WallClock): CalendarDate {
  return { year: clock.year, month: clock.month, day: clock.day };
}

/**
 * Every occurrence of `anchor` repeated by `rule` whose start falls in
 * [range.from, range.to). With no rule the anchor itself is the only
 * candidate. Results are ascending and capped, so a "daily, forever" rule
 * asked for a ten-year window still returns promptly.
 */
export function expandOccurrences(
  anchor: Date,
  rule: RepeatRule | null,
  range: DateRange,
  timeZone: string,
): Date[] {
  if (!rule) {
    return anchor >= range.from && anchor < range.to ? [anchor] : [];
  }

  const anchorClock = wallClockIn(anchor, timeZone);
  const anchorDate = dateOf(anchorClock);
  const firstDate = dateOf(wallClockIn(range.from, timeZone));
  const lastAllowed = rule.until ? dateOf(wallClockIn(rule.until, timeZone)) : null;

  const occurrences: Date[] = [];
  for (const date of candidateDates(anchorDate, rule, firstDate)) {
    if (lastAllowed && compareDates(date, lastAllowed) > 0) break;
    const instant = zonedDateTime(
      { ...date, hour: anchorClock.hour, minute: anchorClock.minute },
      timeZone,
    );
    if (instant >= range.to) break;
    if (instant >= range.from) occurrences.push(instant);
    if (occurrences.length >= MAX_OCCURRENCES) break;
  }
  return occurrences;
}

/** How far ahead "the next occurrence" is looked for before giving up. */
const LOOKAHEAD_DAYS = 400;

/**
 * The occurrence a task is "about" right now: today's if there is one, else
 * the next one coming, else — for a series that has ended — the last one.
 * This is what the tasks page checks off and labels.
 */
export function currentOccurrence(
  anchor: Date,
  rule: RepeatRule | null,
  now: Date,
  timeZone: string,
): Date {
  if (!rule) return anchor;

  const todayStart = zonedDateTime({ ...dateOf(wallClockIn(now, timeZone)), hour: 0, minute: 0 }, timeZone);
  const ahead = expandOccurrences(
    anchor,
    rule,
    { from: todayStart, to: new Date(todayStart.getTime() + LOOKAHEAD_DAYS * MS_PER_DAY) },
    timeZone,
  );
  if (ahead.length > 0) return ahead[0];

  const behind = expandOccurrences(
    anchor,
    rule,
    { from: new Date(todayStart.getTime() - LOOKAHEAD_DAYS * MS_PER_DAY), to: todayStart },
    timeZone,
  );
  return behind.length > 0 ? behind[behind.length - 1] : anchor;
}

function ordinal(day: number): string {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "Every day", "Weekly on Mon, Wed", "Every 2 months on the 15th", "Yearly on Sep 10"… */
export function describeRepeat(rule: RepeatRule | null, anchor: Date, timeZone: string): string {
  if (!rule) return "Does not repeat";
  const clock = wallClockIn(anchor, timeZone);
  const interval = Math.max(1, rule.interval);
  const every = interval === 1 ? "" : `Every ${interval} ${REPEAT_UNIT[rule.frequency]}s`;

  const detail = (() => {
    switch (rule.frequency) {
      case "DAILY":
        return every || "Every day";
      case "WEEKLY": {
        const days = effectiveWeekdays(rule.weekdays, weekdayOf(dateOf(clock)))
          .map((weekday) => WEEKDAY_SHORT[weekday])
          .join(", ");
        return `${every || "Weekly"} on ${days}`;
      }
      case "MONTHLY":
        return `${every || "Monthly"} on the ${ordinal(clock.day)}`;
      case "YEARLY":
        return `${every || "Yearly"} on ${MONTH_SHORT[clock.month - 1]} ${clock.day}`;
    }
  })();

  if (!rule.until) return detail;
  const until = wallClockIn(rule.until, timeZone);
  return `${detail} until ${MONTH_SHORT[until.month - 1]} ${until.day}, ${until.year}`;
}
