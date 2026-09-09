"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import { useRef } from "react";

import { EventChip } from "@/components/calendar/EventCard";
import { useMonthDrag } from "@/components/calendar/useMonthDrag";
import {
  DAYS_PER_WEEK,
  chunkWeeks,
  layoutWeekSegments,
  monthGridDays,
  timedEventsOnDay,
} from "@/lib/calendar/month-grid";
import { atMinutes } from "@/lib/calendar/time";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export interface MonthViewProps {
  readonly month: Date;
  readonly events: readonly CalendarEvent[];
  readonly today: Date | null;
  readonly onSelectDay: (day: Date) => void;
  readonly onEventClick: (event: CalendarEvent) => void;
  readonly onCreate: (start: Date, end: Date, allDay: boolean) => void;
  readonly onMove: (event: CalendarEvent, start: Date, end: Date) => void;
}

/** How many rows of events a cell shows before folding the rest into "+n more". */
const MAX_CELL_ROWS = 4;
const DAY_NUMBER_PX = 28;
const BAR_PX = 22;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekRowProps {
  readonly week: readonly Date[];
  readonly month: Date;
  readonly events: readonly CalendarEvent[];
  readonly today: Date | null;
  readonly draggingId: string | undefined;
  readonly targetDay: Date | undefined;
  readonly onSelectDay: (day: Date) => void;
  readonly onEventClick: (event: CalendarEvent) => void;
}

function WeekRow({
  week,
  month,
  events,
  today,
  draggingId,
  targetDay,
  onSelectDay,
  onEventClick,
}: WeekRowProps) {
  const segments = layoutWeekSegments(events, week);
  const lanes = segments.reduce((max, segment) => Math.max(max, segment.lane + 1), 0);
  const chipRows = Math.max(0, MAX_CELL_ROWS - lanes);
  const columnWidthPct = 100 / DAYS_PER_WEEK;

  return (
    <div className="relative grid min-h-0 grid-cols-7 border-b">
      {week.map((day) => {
        const timed = timedEventsOnDay(events, day);
        const hidden = Math.max(0, timed.length - chipRows);
        const isToday = today !== null && isSameDay(day, today);
        const isTarget = targetDay !== undefined && isSameDay(day, targetDay);

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex min-h-0 flex-col overflow-hidden border-l px-1 pb-1",
              !isSameMonth(day, month) && "bg-muted/40 text-muted-foreground",
              isTarget && "ring-2 ring-inset ring-ring",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "mt-1 flex size-6 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium hover:bg-muted",
                isToday && "bg-primary text-primary-foreground hover:bg-primary",
              )}
              aria-label={`Open ${format(day, "EEEE, MMMM d")}`}
            >
              {day.getDate()}
            </button>
            <div className="flex min-h-0 flex-col gap-px" style={{ paddingTop: lanes * BAR_PX }}>
              {timed.slice(0, chipRows).map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  showTime
                  onOpen={() => onEventClick(event)}
                  isDragging={event.id === draggingId}
                />
              ))}
              {hidden > 0 ? (
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="self-start rounded px-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  +{hidden} more
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {segments.map((segment) => (
        <EventChip
          key={segment.event.id}
          event={segment.event}
          onOpen={() => onEventClick(segment.event)}
          isDragging={segment.event.id === draggingId}
          className={cn(
            "absolute",
            segment.continuesBefore && "rounded-l-none",
            segment.continuesAfter && "rounded-r-none",
          )}
          style={{
            top: DAY_NUMBER_PX + 2 + segment.lane * BAR_PX,
            left: `calc(${segment.startCol * columnWidthPct}% + 3px)`,
            width: `calc(${segment.span * columnWidthPct}% - 6px)`,
          }}
        />
      ))}
    </div>
  );
}

export function MonthView({
  month,
  events,
  today,
  onSelectDay,
  onEventClick,
  onCreate,
  onMove,
}: MonthViewProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const days = monthGridDays(month);
  const weeks = chunkWeeks(days);

  const { draggingId, targetIndex, handlers } = useMonthDrag({
    gridRef,
    days,
    events,
    onEventClick,
    onMove,
    onCreateOnDay: (day) => {
      const midnight = atMinutes(day, 0);
      onCreate(midnight, midnight, true);
    },
  });
  const targetDay = targetIndex === undefined ? undefined : days[targetIndex];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="border-l py-1.5 text-center text-xs font-medium text-muted-foreground">
            {weekday}
          </div>
        ))}
      </div>
      <div
        ref={gridRef}
        {...handlers}
        className={cn("grid min-h-0 flex-1 touch-pan-y", draggingId && "select-none")}
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((week) => (
          <WeekRow
            key={week[0].toISOString()}
            week={week}
            month={month}
            events={events}
            today={today}
            draggingId={draggingId}
            targetDay={targetDay}
            onSelectDay={onSelectDay}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}
