"use client";

import { Calendar } from "@/components/calendar/Calendar";
import { useFamilyEvents } from "@/hooks/use-family-events";
import type { CalendarEvent, CalendarSource } from "@/lib/calendar/types";

export interface FamilyCalendarProps {
  /** Events fetched on the server; the client adopts them on every render. */
  readonly initialEvents: readonly CalendarEvent[];
  /** Household members, as the calendar's toggles and People columns. */
  readonly sources: readonly CalendarSource[];
}

/** The calendar page's client half: database-backed events wired into the grid. */
export function FamilyCalendar({ initialEvents, sources }: FamilyCalendarProps) {
  const { events, error, dismissError, createEvent, updateEvent, deleteEvent, moveEvent } =
    useFamilyEvents(initialEvents, sources);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* A rejected save has already been rolled back on screen; this says why,
          so a change that silently reverted is never a mystery. */}
      {error ? (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-3 border-b bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={dismissError}
            className="shrink-0 rounded px-2 py-0.5 text-xs underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <Calendar
          events={events}
          sources={sources}
          onCreate={createEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
          onMove={moveEvent}
        />
      </div>
    </div>
  );
}
