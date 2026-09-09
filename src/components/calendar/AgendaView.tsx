"use client";

import { format, isSameDay } from "date-fns";
import { Lock, MapPin } from "lucide-react";

import { eventStyle } from "@/components/calendar/EventCard";
import { formatTimeRange } from "@/lib/calendar/format";
import type { AgendaDay } from "@/lib/calendar/agenda";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export interface AgendaViewProps {
  readonly days: readonly AgendaDay[];
  readonly today: Date | null;
  readonly onEventClick: (event: CalendarEvent) => void;
}

function AgendaRow({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
      >
        <span className="w-28 shrink-0 pt-0.5 text-xs text-muted-foreground">
          {event.allDay ? "All day" : formatTimeRange(event.start, event.end)}
        </span>
        <span
          aria-hidden
          className="event-solid mt-1.5 size-2.5 shrink-0 rounded-full"
          style={eventStyle(event)}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{event.title}</span>
            {event.readOnly ? <Lock className="size-3 shrink-0 opacity-60" aria-label="Read-only" /> : null}
          </span>
          {event.location ? (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

export function AgendaView({ days, today, onEventClick }: AgendaViewProps) {
  if (days.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Nothing on the calendar this month.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ol className="mx-auto flex max-w-3xl flex-col gap-4 p-3 sm:p-4">
        {days.map((day) => {
          const isToday = today !== null && isSameDay(day.date, today);
          return (
            <li key={day.date.toISOString()} className="flex flex-col gap-1">
              <h3
                className={cn(
                  "sticky top-0 z-10 flex items-baseline gap-2 bg-background py-1 text-sm font-semibold",
                  isToday && "text-primary",
                )}
              >
                <span>{format(day.date, "EEEE")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {format(day.date, "MMMM d")}
                </span>
                {isToday ? (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    Today
                  </span>
                ) : null}
              </h3>
              <ul className="flex flex-col">
                {day.events.map((event) => (
                  <AgendaRow key={event.id} event={event} onOpen={() => onEventClick(event)} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
