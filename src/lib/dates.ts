const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/** Date.getDay() index for Monday, which is where CalendarKit's week view starts. */
const MONDAY = 1;

/**
 * Local (not UTC) start of the Monday-anchored week containing `date`, matching
 * the week CalendarKit renders. Deliberately plain local-date math — anything
 * timezone-aware belongs in the sync layer, not here.
 */
export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() - MONDAY + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** A wall-clock time on a day offset from `weekStart`. */
export function atTime(
  weekStart: Date,
  dayOffset: number,
  hour: number,
  minute = 0,
): Date {
  const day = addDays(weekStart, dayOffset);
  day.setHours(hour, minute, 0, 0);
  return day;
}
