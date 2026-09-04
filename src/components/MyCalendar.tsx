"use client";

import { Scheduler, type CalendarEvent, type ViewType } from "calendarkit-pro";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CALENDAR_THEME } from "@/lib/calendar-theme";
import { FAMILY_CALENDARS, FAMILY_RESOURCES } from "@/lib/family";
import { EVENT_COLOR_CSS } from "@/lib/event-colors";
import { useFamilyEvents } from "@/hooks/use-family-events";

interface MyCalendarProps {
  /** Events fetched on the server; seeds the client state once on mount. */
  initialEvents?: readonly CalendarEvent[];
}

export default function MyCalendar({ initialEvents = [] }: MyCalendarProps) {
  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(() => new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<readonly string[]>(
    [],
  );

  const { events, createEvent, updateEvent, deleteEvent, rescheduleEvent } =
    useFamilyEvents(initialEvents);

  // CalendarKit's toggle only swaps its own icon; the `dark` class is what
  // actually drives the shadcn tokens it and the rest of the app render against.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const calendars = useMemo(
    () =>
      FAMILY_CALENDARS.map((calendar) => ({
        ...calendar,
        active: !hiddenCalendarIds.includes(calendar.id),
      })),
    [hiddenCalendarIds],
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
    <>
      <style>{EVENT_COLOR_CSS}</style>
      <Scheduler
        className="h-full"
        theme={CALENDAR_THEME}
        events={events}
        calendars={calendars}
        resources={FAMILY_RESOURCES}
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
      />
    </>
  );
}
