import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { WEEK_STARTS_ON, monthGridDays } from "@/lib/calendar/month-grid";
import type { CalendarView, DateRange } from "@/lib/calendar/types";

/** What a view shows for a focus date: the range to fetch and lay out. */
export function visibleRange(view: CalendarView, date: Date): DateRange {
  switch (view) {
    case "month": {
      const days = monthGridDays(date);
      return { from: days[0], to: addDays(days[days.length - 1], 1) };
    }
    case "week": {
      const from = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
      return { from, to: addWeeks(from, 1) };
    }
    case "agenda": {
      const from = startOfMonth(date);
      return { from, to: addMonths(from, 1) };
    }
    case "day":
    case "resource": {
      const from = startOfDay(date);
      return { from, to: addDays(from, 1) };
    }
  }
}

/** The focus date after pressing next (+1) or previous (-1) in a view. */
export function stepDate(view: CalendarView, date: Date, direction: 1 | -1): Date {
  switch (view) {
    case "month":
    case "agenda":
      return addMonths(date, direction);
    case "week":
      return addWeeks(date, direction);
    case "day":
    case "resource":
      return addDays(date, direction);
  }
}

/** Sunday-to-Saturday style span: "Sep 7 – 13, 2026", or across months "Sep 28 – Oct 4, 2026". */
function weekTitle(date: Date): string {
  const from = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  const to = addDays(from, 6);
  if (isSameMonth(from, to)) return `${format(from, "MMM d")} – ${format(to, "d, yyyy")}`;
  if (isSameYear(from, to)) return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
  return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
}

/** The heading above the grid. */
export function rangeTitle(view: CalendarView, date: Date): string {
  switch (view) {
    case "month":
    case "agenda":
      return format(date, "MMMM yyyy");
    case "week":
      return weekTitle(date);
    case "day":
    case "resource":
      return format(date, "EEEE, MMMM d, yyyy");
  }
}
