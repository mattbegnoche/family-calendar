"use client";

import { addDays, eachDayOfInterval, format, isSameDay, min, startOfDay } from "date-fns";
import { useCallback, useMemo, useState } from "react";

import { AgendaView } from "@/components/calendar/AgendaView";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarSidePanel } from "@/components/calendar/CalendarSidePanel";
import { EventDetails } from "@/components/calendar/EventDetails";
import { EventForm, type EventSeed } from "@/components/calendar/EventForm";
import { dayKey } from "@/components/calendar/MiniCalendar";
import { MonthView } from "@/components/calendar/MonthView";
import { TimeGrid, type TimeGridColumn } from "@/components/calendar/TimeGrid";
import { useNow } from "@/components/calendar/useNow";
import { useIsMobile } from "@/hooks/use-mobile";
import { agendaDays } from "@/lib/calendar/agenda";
import { DAYS_PER_WEEK, lastDayOf } from "@/lib/calendar/month-grid";
import { rangeTitle, stepDate, visibleRange } from "@/lib/calendar/range";
import {
  DEFAULT_EVENT_MINUTES,
  MINUTES_PER_HOUR,
  atMinutes,
  minutesSinceMidnight,
} from "@/lib/calendar/time";
import type {
  CalendarEvent,
  CalendarSource,
  CalendarView,
  EventDraft,
} from "@/lib/calendar/types";

export interface CalendarProps {
  readonly events: readonly CalendarEvent[];
  readonly sources: readonly CalendarSource[];
  readonly onCreate: (draft: EventDraft) => void;
  readonly onUpdate: (eventId: string, draft: EventDraft) => void;
  readonly onDelete: (eventId: string) => void;
  readonly onMove: (event: CalendarEvent, start: Date, end: Date, calendarId?: string) => void;
  readonly initialView?: CalendarView;
}

type Editor =
  | { readonly kind: "closed" }
  | { readonly kind: "create"; readonly seed: EventSeed }
  | { readonly kind: "edit"; readonly event: CalendarEvent }
  | { readonly kind: "details"; readonly event: CalendarEvent };

const CLOSED: Editor = { kind: "closed" };

/** Longest run of dots one event may paint in the mini calendar. */
const MAX_DOT_SPAN_DAYS = 366;

function dayColumns(days: readonly Date[], today: Date | null): TimeGridColumn[] {
  return days.map((day) => ({
    key: day.toISOString(),
    date: day,
    label: format(day, "EEE"),
    sublabel: format(day, "d"),
    isToday: today !== null && isSameDay(day, today),
  }));
}

function memberColumns(
  sources: readonly CalendarSource[],
  day: Date,
  today: Date | null,
): TimeGridColumn[] {
  const isToday = today !== null && isSameDay(day, today);
  return sources.map((source) => ({
    key: source.id,
    date: day,
    calendarId: source.id,
    label: source.label,
    color: source.color,
    isToday,
  }));
}

/** The next full hour on the focused day: where "New event" starts by default. */
function nextHourOn(day: Date, now: Date | null): Date {
  const reference = now && isSameDay(day, now) ? now : atMinutes(day, 9 * MINUTES_PER_HOUR);
  const minutes = Math.ceil(minutesSinceMidnight(reference) / MINUTES_PER_HOUR) * MINUTES_PER_HOUR;
  return atMinutes(startOfDay(day), minutes);
}

/** Every day at least one event touches, keyed for the mini calendar's dots. */
function daysWithEvents(events: readonly CalendarEvent[]): ReadonlySet<string> {
  return new Set(
    events.flatMap((event) => {
      const start = startOfDay(event.start);
      const end = min([lastDayOf(event), addDays(start, MAX_DOT_SPAN_DAYS)]);
      return eachDayOfInterval({ start, end }).map(dayKey);
    }),
  );
}

/**
 * The calendar itself: view and date state, the side panel, the editor, and
 * the five views. Data comes in as props and every change goes out through a
 * callback, so this knows nothing about the server.
 */
export function Calendar({
  events,
  sources,
  onCreate,
  onUpdate,
  onDelete,
  onMove,
  initialView = "week",
}: CalendarProps) {
  const [view, setView] = useState<CalendarView>(initialView);
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [editor, setEditor] = useState<Editor>(CLOSED);
  // Null until someone toggles it: open on wide screens, closed on phones,
  // where it slides over the grid instead of sitting beside it.
  const [panelChoice, setPanelChoice] = useState<boolean | null>(null);
  const isMobile = useIsMobile();
  const isPanelOpen = panelChoice ?? !isMobile;
  const today = useNow();

  const visibleEvents = useMemo(
    () => events.filter((event) => !hiddenIds.has(event.calendarId)),
    [events, hiddenIds],
  );
  const visibleSources = useMemo(
    () => sources.filter((source) => !hiddenIds.has(source.id)),
    [sources, hiddenIds],
  );
  const eventDays = useMemo(() => daysWithEvents(visibleEvents), [visibleEvents]);
  const range = useMemo(() => visibleRange(view, date), [view, date]);

  const toggleSource = useCallback((id: string, visible: boolean) => {
    setHiddenIds((previous) => {
      const next = new Set(previous);
      if (visible) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openEvent = useCallback((event: CalendarEvent) => {
    setEditor(event.readOnly ? { kind: "details", event } : { kind: "edit", event });
  }, []);

  const startCreate = useCallback(
    (start: Date, end: Date, allDay: boolean, calendarId?: string) => {
      setEditor({ kind: "create", seed: { start, end, allDay, calendarId } });
    },
    [],
  );

  const closeEditor = useCallback(() => setEditor(CLOSED), []);

  const handleSave = (draft: EventDraft) => {
    if (editor.kind === "edit") onUpdate(editor.event.id, draft);
    else onCreate(draft);
    closeEditor();
  };

  const handleDelete = (eventId: string) => {
    onDelete(eventId);
    closeEditor();
  };

  const showDay = (day: Date) => {
    setDate(startOfDay(day));
    setView("day");
  };

  const jumpToDate = (day: Date) => {
    setDate(startOfDay(day));
    if (isMobile) setPanelChoice(false);
  };

  const body = (() => {
    switch (view) {
      case "week":
        return (
          <TimeGrid
            columns={dayColumns(
              Array.from({ length: DAYS_PER_WEEK }, (_, offset) => addDays(range.from, offset)),
              today,
            )}
            events={visibleEvents}
            allDayLayout="span"
            onEventClick={openEvent}
            onCreate={startCreate}
            onMove={onMove}
          />
        );
      case "day":
        return (
          <TimeGrid
            columns={dayColumns([range.from], today)}
            events={visibleEvents}
            allDayLayout="span"
            onEventClick={openEvent}
            onCreate={startCreate}
            onMove={onMove}
          />
        );
      case "resource":
        if (visibleSources.length === 0) {
          return (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              Turn on at least one person in the calendars list to see their column.
            </div>
          );
        }
        return (
          <TimeGrid
            columns={memberColumns(visibleSources, range.from, today)}
            events={visibleEvents}
            allDayLayout="perColumn"
            onEventClick={openEvent}
            onCreate={startCreate}
            onMove={onMove}
          />
        );
      case "month":
        return (
          <MonthView
            month={date}
            events={visibleEvents}
            today={today}
            onSelectDay={showDay}
            onEventClick={openEvent}
            onCreate={startCreate}
            onMove={onMove}
          />
        );
      case "agenda":
        return (
          <AgendaView days={agendaDays(visibleEvents, range)} today={today} onEventClick={openEvent} />
        );
    }
  })();

  const panel = (
    <CalendarSidePanel
      focusDate={date}
      today={today}
      eventDays={eventDays}
      sources={sources}
      hiddenIds={hiddenIds}
      onSelectDate={jumpToDate}
      onToggleSource={toggleSource}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CalendarHeader
        title={rangeTitle(view, date)}
        view={view}
        onViewChange={setView}
        onPrevious={() => setDate((current) => stepDate(view, current, -1))}
        onNext={() => setDate((current) => stepDate(view, current, 1))}
        onToday={() => setDate(startOfDay(new Date()))}
        onNewEvent={() => {
          const start = nextHourOn(date, today);
          startCreate(start, atMinutes(start, minutesSinceMidnight(start) + DEFAULT_EVENT_MINUTES), false);
        }}
        isPanelOpen={isPanelOpen}
        onTogglePanel={() => setPanelChoice(!isPanelOpen)}
      />

      <div className="relative flex min-h-0 flex-1">
        {isPanelOpen && !isMobile ? (
          <aside className="w-60 shrink-0 overflow-y-auto border-r">{panel}</aside>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">{body}</div>

        {isPanelOpen && isMobile ? (
          <div
            className="absolute inset-0 z-30 flex bg-black/40"
            onClick={() => setPanelChoice(false)}
          >
            <aside
              className="h-full w-72 max-w-[85%] overflow-y-auto border-r bg-background shadow-xl"
              onClick={(click) => click.stopPropagation()}
            >
              {panel}
            </aside>
          </div>
        ) : null}
      </div>

      {/* Mounted per open, so the form starts from this seed or event. */}
      {editor.kind === "create" || editor.kind === "edit" ? (
        <EventForm
          isOpen
          onClose={closeEditor}
          event={editor.kind === "edit" ? editor.event : null}
          seed={editor.kind === "create" ? editor.seed : null}
          members={sources}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
      <EventDetails event={editor.kind === "details" ? editor.event : null} onClose={closeEditor} />
    </div>
  );
}
