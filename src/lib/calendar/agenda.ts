import { addDays, eachDayOfInterval, startOfDay } from "date-fns";

import { byStart, touchesDay } from "@/lib/calendar/month-grid";
import type { CalendarEvent, DateRange } from "@/lib/calendar/types";

export interface AgendaDay {
  readonly date: Date;
  readonly events: readonly CalendarEvent[];
}

/** All-day first, then by start time: how a printed schedule reads. */
function agendaOrder(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return byStart(a, b);
}

/**
 * The days in `range` that have events, each with the events touching it. A
 * multi-day event is listed on every day it covers; days with nothing on are
 * left out entirely rather than shown empty.
 */
export function agendaDays(events: readonly CalendarEvent[], range: DateRange): AgendaDay[] {
  const lastDay = addDays(startOfDay(range.to), -1);
  if (lastDay < startOfDay(range.from)) return [];

  return eachDayOfInterval({ start: startOfDay(range.from), end: lastDay })
    .map((date) => ({
      date,
      events: events.filter((event) => touchesDay(event, date)).sort(agendaOrder),
    }))
    .filter((day) => day.events.length > 0);
}
