"use client";

import { Scheduler, type CalendarEvent, type ViewType } from "calendarkit-pro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EventForm } from "@/components/calendar/EventForm";
import { CALENDAR_THEME } from "@/lib/calendar-theme";
import { buildEventColorCss } from "@/lib/event-colors";
import { useFamilyEvents } from "@/hooks/use-family-events";

export interface CalendarSource {
  id: string;
  label: string;
  color: string;
}

interface MyCalendarProps {
  /** Events fetched on the server; seeds the client state once on mount. */
  initialEvents?: readonly CalendarEvent[];
  /** Household members, as CalendarKit's toggleable calendar list. */
  calendars: readonly CalendarSource[];
  resources: readonly CalendarSource[];
}

export default function MyCalendar({
  initialEvents = [],
  calendars,
  resources,
}: MyCalendarProps) {
  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(() => new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<readonly string[]>(
    [],
  );

  const {
    events,
    error,
    dismissError,
    createEvent,
    updateEvent,
    deleteEvent,
    rescheduleEvent,
  } = useFamilyEvents(initialEvents);

  // CalendarKit's toggle only swaps its own icon; the `dark` class is what
  // actually drives the shadcn tokens it and the rest of the app render against.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Derived from the members actually on screen, so a member added later gets
  // its override rules without a rebuild.
  const colorCss = useMemo(
    () => buildEventColorCss(calendars.map((calendar) => calendar.color)),
    [calendars],
  );

  const activeCalendars = useMemo(
    () =>
      calendars.map((calendar) => ({
        ...calendar,
        active: !hiddenCalendarIds.includes(calendar.id),
      })),
    [calendars, hiddenCalendarIds],
  );

  const handleCalendarToggle = useCallback(
    (calendarId: string, active: boolean) => {
      setHiddenCalendarIds((previous) =>
        active
          ? previous.filter((id) => id !== calendarId)
          : [...previous, calendarId],
      );
    },
    [],
  );

  const toggleTheme = useCallback(() => setIsDarkMode((dark) => !dark), []);

  return (
    <div className="flex h-full flex-col">
      <style>{colorCss}</style>
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
      <Scheduler
        className="min-h-0 flex-1"
        theme={CALENDAR_THEME}
        events={events}
        calendars={activeCalendars}
        resources={[...resources]}
        onCalendarToggle={handleCalendarToggle}
        view={view}
        onViewChange={setView}
        date={date}
        onDateChange={setDate}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
        onEventCreate={createEvent}
        onEventUpdate={updateEvent}
        onEventDelete={deleteEvent}
        onEventDrop={rescheduleEvent}
        onEventResize={rescheduleEvent}
        // Replaces CalendarKit's modal, which offers Reminders, Guests and
        // Attachments — none of which this app stores.
        renderEventForm={(formProps) => (
          <EventForm {...formProps} members={calendars} />
        )}
      />
    </div>
  );
}
