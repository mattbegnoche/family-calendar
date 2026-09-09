"use client";

import { isSameDay } from "date-fns";
import { useEffect, useMemo, useRef } from "react";

import { EventChip, TimedEventCard } from "@/components/calendar/EventCard";
import { GRID_HEIGHT_PX, HOUR_HEIGHT_PX, minutesToPx } from "@/components/calendar/geometry";
import { useNow } from "@/components/calendar/useNow";
import {
  useGridDrag,
  type DragPreview,
  type GridColumn,
  type GridDragCallbacks,
} from "@/components/calendar/useGridDrag";
import { formatTimeRange } from "@/lib/calendar/format";
import { layoutDayEvents, type TimedPlacement } from "@/lib/calendar/layout";
import { layoutWeekSegments, touchesDay } from "@/lib/calendar/month-grid";
import { HOURS_PER_DAY, MINUTES_PER_HOUR, minutesSinceMidnight, sliceOnDay } from "@/lib/calendar/time";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

/**
 * The hour-by-hour grid behind the week, day and people views. Columns are
 * whatever the caller says they are — seven days, one day, or one member per
 * column on a single day — and everything else is the same code.
 */

export interface TimeGridColumn extends GridColumn {
  readonly label: string;
  readonly sublabel?: string;
  readonly color?: string;
  readonly isToday: boolean;
}

export interface TimeGridProps extends GridDragCallbacks {
  readonly columns: readonly TimeGridColumn[];
  readonly events: readonly CalendarEvent[];
  /**
   * "span": consecutive days, so an all-day event runs as one bar across the
   * days it covers. "perColumn": columns are members on one day, so each
   * column lists its own all-day events.
   */
  readonly allDayLayout: "span" | "perColumn";
}

const GUTTER_CLASS = "w-14 shrink-0";
const ALL_DAY_ROW_PX = 22;
/** Where the grid scrolls to on open when today is not in view. */
const MORNING_MINUTES = 7 * MINUTES_PER_HOUR;
const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

function hourLabel(hour: number): string {
  if (hour === 0) return "";
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${hour < 12 ? "AM" : "PM"}`;
}

function columnEvents(column: TimeGridColumn, events: readonly CalendarEvent[]): CalendarEvent[] {
  if (column.calendarId === undefined) return [...events];
  return events.filter((event) => event.calendarId === column.calendarId);
}

interface CardGeometry {
  readonly top: number;
  readonly height: number;
  readonly leftPct: number;
  readonly widthPct: number;
}

function cardGeometry(
  placement: Pick<TimedPlacement, "startMinutes" | "endMinutes" | "column" | "columns">,
  columnIndex: number,
  columnCount: number,
): CardGeometry {
  const columnWidthPct = 100 / columnCount;
  const subWidthPct = columnWidthPct / placement.columns;
  return {
    top: minutesToPx(placement.startMinutes),
    height: minutesToPx(placement.endMinutes - placement.startMinutes),
    leftPct: columnIndex * columnWidthPct + placement.column * subWidthPct,
    widthPct: subWidthPct,
  };
}

interface ColumnHeaderProps {
  readonly column: TimeGridColumn;
}

function ColumnHeader({ column }: ColumnHeaderProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center border-l py-1.5 text-center">
      {column.color ? (
        <span className="mb-0.5 size-2 rounded-full" style={{ backgroundColor: column.color }} />
      ) : null}
      <span className={cn("truncate text-xs font-medium", column.isToday && "text-primary")}>
        {column.label}
      </span>
      {column.sublabel ? (
        <span
          className={cn(
            "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold",
            column.isToday ? "bg-primary text-primary-foreground" : "text-foreground",
          )}
        >
          {column.sublabel}
        </span>
      ) : null}
    </div>
  );
}

interface AllDayRowProps {
  readonly columns: readonly TimeGridColumn[];
  readonly events: readonly CalendarEvent[];
  readonly layout: "span" | "perColumn";
  readonly preview: DragPreview | null;
  readonly onEventClick: (event: CalendarEvent) => void;
}

function AllDayRow({ columns, events, layout, preview, onEventClick }: AllDayRowProps) {
  const allDay = events.filter((event) => event.allDay);
  const columnWidthPct = 100 / columns.length;
  const draggingId = preview?.mode === "moveAllDay" ? preview.event?.id : undefined;

  const segments = layout === "span" ? layoutWeekSegments(allDay, columns.map((column) => column.date)) : [];
  const perColumn =
    layout === "perColumn"
      ? columns.map((column) => columnEvents(column, allDay).filter((event) => touchesDay(event, column.date)))
      : [];
  const lanes =
    layout === "span"
      ? segments.reduce((max, segment) => Math.max(max, segment.lane + 1), 0)
      : perColumn.reduce((max, list) => Math.max(max, list.length), 0);
  const previewSpan =
    preview && (preview.mode === "moveAllDay" || preview.mode === "createAllDay")
      ? layoutWeekSegments(
          [
            {
              id: "preview",
              title: preview.event?.title ?? "New event",
              start: preview.start,
              end: preview.end,
              allDay: true,
              calendarId: preview.event?.calendarId ?? "",
              color: preview.event?.color ?? "#64748b",
              source: preview.event?.source ?? "local",
              readOnly: false,
            },
          ],
          columns.map((column) => column.date),
        )[0]
      : null;

  return (
    <div data-grid-zone="allday" className="flex border-b">
      <div className={cn(GUTTER_CLASS, "py-1 pr-2 text-right text-[10px] leading-4 text-muted-foreground")}>
        all-day
      </div>
      <div
        className="relative flex-1 border-l"
        style={{ minHeight: Math.max(1, lanes + (previewSpan ? 1 : 0)) * ALL_DAY_ROW_PX + 4 }}
      >
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
              top: 2 + segment.lane * ALL_DAY_ROW_PX,
              left: `calc(${segment.startCol * columnWidthPct}% + 2px)`,
              width: `calc(${segment.span * columnWidthPct}% - 4px)`,
            }}
          />
        ))}
        {perColumn.map((list, columnIndex) =>
          list.map((event, row) => (
            <EventChip
              key={event.id}
              event={event}
              onOpen={() => onEventClick(event)}
              isDragging={event.id === draggingId}
              className="absolute"
              style={{
                top: 2 + row * ALL_DAY_ROW_PX,
                left: `calc(${columnIndex * columnWidthPct}% + 2px)`,
                width: `calc(${columnWidthPct}% - 4px)`,
              }}
            />
          )),
        )}
        {previewSpan ? (
          <EventChip
            event={previewSpan.event}
            onOpen={() => undefined}
            isPreview
            className="absolute"
            style={{
              top: 2 + lanes * ALL_DAY_ROW_PX,
              left: `calc(${previewSpan.startCol * columnWidthPct}% + 2px)`,
              width: `calc(${previewSpan.span * columnWidthPct}% - 4px)`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

interface PreviewCardProps {
  readonly preview: DragPreview;
  readonly columns: readonly TimeGridColumn[];
}

/** The ghost for a timed move, resize or drag-to-create. */
function PreviewCard({ preview, columns }: PreviewCardProps) {
  if (preview.allDay) return null;
  const column = columns[preview.column];
  const slice = sliceOnDay(preview.start, preview.end, column.date);
  if (!slice) return null;

  const geometry = cardGeometry({ ...slice, column: 0, columns: 1 }, preview.column, columns.length);
  if (preview.event) {
    return (
      <TimedEventCard
        event={{ ...preview.event, start: preview.start, end: preview.end }}
        {...geometry}
        onOpen={() => undefined}
        isPreview
      />
    );
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20 rounded-md border-2 border-dashed border-primary bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
      style={{
        top: geometry.top,
        height: geometry.height,
        left: `calc(${geometry.leftPct}% + 1px)`,
        width: `calc(${geometry.widthPct}% - 3px)`,
      }}
    >
      {formatTimeRange(preview.start, preview.end)}
    </div>
  );
}

export function TimeGrid({
  columns,
  events,
  allDayLayout,
  onEventClick,
  onCreate,
  onMove,
}: TimeGridProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNow();

  const { state, preview, handlers } = useGridDrag({
    columns,
    events,
    canvasRef,
    onEventClick,
    onCreate,
    onMove,
  });

  const placements = useMemo(
    () =>
      columns.map((column) => layoutDayEvents(columnEvents(column, events), column.date)),
    [columns, events],
  );

  // Open on the working morning, or an hour before now when today is on screen.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const hasToday = columns.some((column) => column.isToday);
    const target = hasToday
      ? Math.max(0, minutesSinceMidnight(new Date()) - MINUTES_PER_HOUR)
      : MORNING_MINUTES;
    scroller.scrollTop = minutesToPx(target);
    // Only on first mount and when the set of days changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.map((column) => column.key).join("|")]);

  const draggingId =
    preview && (preview.mode === "move" || preview.mode === "resize") ? preview.event?.id : undefined;
  const columnWidthPct = 100 / columns.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b">
        <div className={GUTTER_CLASS} />
        {columns.map((column) => (
          <ColumnHeader key={column.key} column={column} />
        ))}
      </div>

      <div
        {...handlers}
        className={cn(
          "flex min-h-0 flex-1 flex-col touch-pan-y",
          state.phase === "active" && "select-none",
        )}
      >
        <AllDayRow
          columns={columns}
          events={events}
          layout={allDayLayout}
          preview={preview}
          onEventClick={onEventClick}
        />

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex" style={{ height: GRID_HEIGHT_PX }}>
            <div className={cn(GUTTER_CLASS, "relative")}>
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
                  style={{ top: hour * HOUR_HEIGHT_PX }}
                >
                  {hourLabel(hour)}
                </span>
              ))}
            </div>

            <div ref={canvasRef} data-grid-zone="grid" className="relative flex-1 cursor-crosshair">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  aria-hidden
                  className="absolute inset-x-0 border-t border-border/70"
                  style={{ top: hour * HOUR_HEIGHT_PX }}
                />
              ))}
              {columns.map((column, index) => (
                <div
                  key={column.key}
                  aria-hidden
                  className={cn("absolute inset-y-0 border-l", column.isToday && "bg-primary/[0.03]")}
                  style={{ left: `${index * columnWidthPct}%`, width: `${columnWidthPct}%` }}
                />
              ))}

              {placements.map((columnPlacements, columnIndex) =>
                columnPlacements.map((placement) => (
                  <TimedEventCard
                    key={placement.event.id}
                    event={placement.event}
                    {...cardGeometry(placement, columnIndex, columns.length)}
                    onOpen={() => onEventClick(placement.event)}
                    isDragging={placement.event.id === draggingId}
                  />
                )),
              )}

              {preview ? <PreviewCard preview={preview} columns={columns} /> : null}

              {now
                ? columns.map((column, index) =>
                    isSameDay(column.date, now) ? (
                      <div
                        key={`now-${column.key}`}
                        aria-hidden
                        className="pointer-events-none absolute z-10 h-0.5 bg-red-500"
                        style={{
                          top: minutesToPx(minutesSinceMidnight(now)),
                          left: `${index * columnWidthPct}%`,
                          width: `${columnWidthPct}%`,
                        }}
                      >
                        <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-red-500" />
                      </div>
                    ) : null,
                  )
                : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
