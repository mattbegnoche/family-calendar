"use client";

import { addDays, differenceInCalendarDays, differenceInMilliseconds } from "date-fns";
import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

import { hasMovedPastThreshold, locateInGrid } from "@/components/calendar/geometry";
import {
  DEFAULT_EVENT_MINUTES,
  MIN_EVENT_MINUTES,
  MINUTES_PER_DAY,
  SNAP_MINUTES,
  atMinutes,
  clampMinutes,
  snapMinutes,
} from "@/lib/calendar/time";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * Pointer handling for the time grid: click-to-create, drag-to-create, drag
 * to move, drag the bottom edge to resize, and drag an all-day chip between
 * days. One state machine rather than a drag library, because every gesture
 * here reduces to "which column, which minute", and that is a rect lookup.
 *
 * A press starts as `pending`; only once the pointer has travelled past a
 * small threshold does it become `active`. That is what lets an event be a
 * button (click opens it) and a drag handle at the same time.
 */

export interface GridColumn {
  readonly key: string;
  readonly date: Date;
  /** Set in the People view, where each column is a member rather than a day. */
  readonly calendarId?: string;
}

export type DragMode = "move" | "resize" | "create" | "moveAllDay" | "createAllDay";

interface DragOrigin {
  readonly mode: DragMode;
  readonly event: CalendarEvent | null;
  readonly column: number;
  readonly minutes: number;
  readonly clientX: number;
  readonly clientY: number;
  /** For a move: how far into the event the pointer grabbed it, so it does not jump. */
  readonly grabOffsetMinutes: number;
}

export type DragState =
  | { readonly phase: "idle" }
  | { readonly phase: "pending"; readonly origin: DragOrigin }
  | {
      readonly phase: "active";
      readonly origin: DragOrigin;
      readonly column: number;
      readonly minutes: number;
    };

const IDLE: DragState = { phase: "idle" };

/** What the grid draws while a gesture is in progress. */
export interface DragPreview {
  readonly mode: DragMode;
  readonly event: CalendarEvent | null;
  readonly column: number;
  readonly start: Date;
  readonly end: Date;
  readonly allDay: boolean;
}

export interface GridDragCallbacks {
  readonly onEventClick: (event: CalendarEvent) => void;
  readonly onCreate: (start: Date, end: Date, allDay: boolean, calendarId?: string) => void;
  readonly onMove: (event: CalendarEvent, start: Date, end: Date, calendarId?: string) => void;
}

export interface UseGridDragOptions extends GridDragCallbacks {
  readonly columns: readonly GridColumn[];
  readonly events: readonly CalendarEvent[];
  /** The element whose left/top/width define column and minute positions. */
  readonly canvasRef: React.RefObject<HTMLElement | null>;
}

const PRIMARY_BUTTON = 0;

function eventFromTarget(
  target: EventTarget | null,
  events: readonly CalendarEvent[],
): { event: CalendarEvent | null; isResizeHandle: boolean; zone: "grid" | "allday" } {
  const element = target instanceof Element ? target : null;
  const card = element?.closest<HTMLElement>("[data-event-id]") ?? null;
  const id = card?.dataset.eventId;
  const zoneElement = element?.closest<HTMLElement>("[data-grid-zone]");
  return {
    event: id ? (events.find((candidate) => candidate.id === id) ?? null) : null,
    isResizeHandle: element?.closest("[data-resize-handle]") !== null,
    zone: zoneElement?.dataset.gridZone === "allday" ? "allday" : "grid",
  };
}

function modeFor(
  event: CalendarEvent | null,
  isResizeHandle: boolean,
  zone: "grid" | "allday",
): DragMode | null {
  if (zone === "allday") {
    if (!event) return "createAllDay";
    return event.readOnly ? null : "moveAllDay";
  }
  if (!event) return "create";
  if (event.readOnly) return null;
  return isResizeHandle ? "resize" : "move";
}

/** The preview for the current pointer position, or null while nothing is being dragged. */
function previewFor(state: DragState, columns: readonly GridColumn[]): DragPreview | null {
  if (state.phase !== "active") return null;
  const { origin, column: columnIndex, minutes } = state;
  const column = columns[columnIndex];
  const event = origin.event;

  switch (origin.mode) {
    case "create": {
      const from = snapMinutes(Math.min(origin.minutes, minutes));
      const to = Math.max(snapMinutes(Math.max(origin.minutes, minutes)), from + MIN_EVENT_MINUTES);
      return {
        mode: "create",
        event: null,
        column: origin.column,
        start: atMinutes(columns[origin.column].date, from),
        end: atMinutes(columns[origin.column].date, to),
        allDay: false,
      };
    }
    case "move": {
      if (!event) return null;
      const duration = differenceInMilliseconds(event.end, event.start);
      const durationMinutes = Math.max(MIN_EVENT_MINUTES, duration / 60_000);
      const latestStart = Math.max(0, MINUTES_PER_DAY - durationMinutes);
      const startMinutes = Math.min(
        latestStart,
        clampMinutes(snapMinutes(minutes - origin.grabOffsetMinutes)),
      );
      const start = atMinutes(column.date, startMinutes);
      return {
        mode: "move",
        event,
        column: columnIndex,
        start,
        end: new Date(start.getTime() + duration),
        allDay: false,
      };
    }
    case "resize": {
      if (!event) return null;
      const startColumn = columns[origin.column];
      const endMinutes = Math.max(
        snapMinutes(minutes),
        // Never shorter than the minimum, measured from where the event
        // starts in the column the handle lives in.
        (event.start < startColumn.date ? 0 : minutesOf(event.start)) + MIN_EVENT_MINUTES,
      );
      return {
        mode: "resize",
        event,
        column: origin.column,
        start: event.start,
        end: atMinutes(startColumn.date, clampMinutes(endMinutes)),
        allDay: false,
      };
    }
    case "moveAllDay": {
      if (!event) return null;
      const dayDelta = differenceInCalendarDays(column.date, columns[origin.column].date);
      return {
        mode: "moveAllDay",
        event,
        column: columnIndex,
        start: addDays(event.start, dayDelta),
        end: addDays(event.end, dayDelta),
        allDay: true,
      };
    }
    case "createAllDay": {
      const first = Math.min(origin.column, columnIndex);
      const last = Math.max(origin.column, columnIndex);
      return {
        mode: "createAllDay",
        event: null,
        column: first,
        start: atMinutes(columns[first].date, 0),
        end: atMinutes(columns[last].date, 0),
        allDay: true,
      };
    }
  }
}

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export interface GridDrag {
  readonly state: DragState;
  readonly preview: DragPreview | null;
  readonly handlers: {
    readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    readonly onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    readonly onPointerCancel: () => void;
  };
}

export function useGridDrag({
  columns,
  events,
  canvasRef,
  onEventClick,
  onCreate,
  onMove,
}: UseGridDragOptions): GridDrag {
  const [state, setState] = useState<DragState>(IDLE);

  const locate = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return locateInGrid(canvas.getBoundingClientRect(), columns.length, clientX, clientY);
    },
    [canvasRef, columns.length],
  );

  const onPointerDown = useCallback(
    (pointer: ReactPointerEvent<HTMLElement>) => {
      if (pointer.button !== PRIMARY_BUTTON) return;
      const point = locate(pointer.clientX, pointer.clientY);
      if (!point) return;

      const { event, isResizeHandle, zone } = eventFromTarget(pointer.target, events);
      const mode = modeFor(event, isResizeHandle, zone);
      // A read-only event still opens on click; it just never becomes a drag.
      if (mode === null) {
        if (event) {
          setState({
            phase: "pending",
            origin: { mode: "move", event, ...point, clientX: pointer.clientX, clientY: pointer.clientY, grabOffsetMinutes: 0 },
          });
        }
        return;
      }

      const grabOffsetMinutes =
        mode === "move" && event
          ? point.minutes - (event.start < columns[point.column].date ? 0 : minutesOf(event.start))
          : 0;

      pointer.currentTarget.setPointerCapture(pointer.pointerId);
      setState({
        phase: "pending",
        origin: {
          mode,
          event,
          column: point.column,
          minutes: point.minutes,
          clientX: pointer.clientX,
          clientY: pointer.clientY,
          grabOffsetMinutes,
        },
      });
    },
    [columns, events, locate],
  );

  const onPointerMove = useCallback(
    (pointer: ReactPointerEvent<HTMLElement>) => {
      setState((current) => {
        if (current.phase === "idle") return current;
        const point = locate(pointer.clientX, pointer.clientY);
        if (!point) return current;

        if (current.phase === "pending") {
          const moved = hasMovedPastThreshold(
            pointer.clientX - current.origin.clientX,
            pointer.clientY - current.origin.clientY,
          );
          // A read-only event was captured only so a click can open it.
          if (!moved || current.origin.event?.readOnly) return current;
          return { phase: "active", origin: current.origin, ...point };
        }
        return { ...current, ...point };
      });
    },
    [locate],
  );

  const finish = useCallback(
    (current: DragState) => {
      if (current.phase === "pending") {
        const { origin } = current;
        if (origin.event) {
          onEventClick(origin.event);
          return;
        }
        const column = columns[origin.column];
        if (origin.mode === "createAllDay") {
          const day = atMinutes(column.date, 0);
          onCreate(day, day, true, column.calendarId);
          return;
        }
        // A plain click makes an hour-long event starting at the slot under the pointer.
        const from = Math.floor(origin.minutes / SNAP_MINUTES) * SNAP_MINUTES;
        const start = atMinutes(column.date, from);
        onCreate(start, atMinutes(column.date, from + DEFAULT_EVENT_MINUTES), false, column.calendarId);
        return;
      }

      if (current.phase !== "active") return;
      const preview = previewFor(current, columns);
      if (!preview) return;
      const column = columns[preview.column];

      if (preview.mode === "create" || preview.mode === "createAllDay") {
        onCreate(preview.start, preview.end, preview.allDay, column.calendarId);
        return;
      }
      if (!preview.event) return;
      // Only report a change: a drag that lands where it started is a no-op,
      // not a save.
      const unchanged =
        preview.start.getTime() === preview.event.start.getTime() &&
        preview.end.getTime() === preview.event.end.getTime() &&
        (column.calendarId === undefined || column.calendarId === preview.event.calendarId);
      if (unchanged) return;
      onMove(preview.event, preview.start, preview.end, column.calendarId);
    },
    [columns, onCreate, onEventClick, onMove],
  );

  const onPointerUp = useCallback(
    (pointer: ReactPointerEvent<HTMLElement>) => {
      if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) {
        pointer.currentTarget.releasePointerCapture(pointer.pointerId);
      }
      setState((current) => {
        finish(current);
        return IDLE;
      });
    },
    [finish],
  );

  const onPointerCancel = useCallback(() => setState(IDLE), []);

  // Escape abandons a drag in progress.
  useEffect(() => {
    if (state.phase !== "active") return;
    const onKeyDown = (keyboard: KeyboardEvent) => {
      if (keyboard.key === "Escape") setState(IDLE);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.phase]);

  return {
    state,
    preview: previewFor(state, columns),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
