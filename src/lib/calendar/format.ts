import { format, isSameDay } from "date-fns";

import type { CalendarEvent } from "@/lib/calendar/types";

/** "3 PM" on the hour, "3:30 PM" otherwise: what the hour gutter and chips show. */
export function formatTime(date: Date): string {
  return date.getMinutes() === 0 ? format(date, "h a") : format(date, "h:mm a");
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** The "when" line on a details card, phrased for the kind of event it is. */
export function formatEventWhen(event: CalendarEvent): string {
  if (event.allDay) {
    if (isSameDay(event.start, event.end)) return format(event.start, "EEEE, MMMM d");
    return `${format(event.start, "EEE, MMM d")} – ${format(event.end, "EEE, MMM d")}`;
  }
  if (isSameDay(event.start, event.end)) {
    return `${format(event.start, "EEEE, MMMM d")} · ${formatTimeRange(event.start, event.end)}`;
  }
  return `${format(event.start, "EEE, MMM d, h:mm a")} – ${format(event.end, "EEE, MMM d, h:mm a")}`;
}
