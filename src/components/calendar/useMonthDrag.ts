"use client";

import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { hasMovedPastThreshold } from "@/components/calendar/geometry";
import { DAYS_PER_WEEK } from "@/lib/calendar/month-grid";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * Drag an event from one day to another in the month grid. The grid is
 * equal-height rows of seven equal cells, so the cell under the pointer is a
 * division, not a DOM search. Same pending → active shape as the time grid.
 */

interface Origin {
  readonly event: CalendarEvent | null;
  readonly dayIndex: number;
  readonly clientX: number;
  readonly clientY: number;
}

type MonthDragState =
  | { readonly phase: "idle" }
  | { readonly phase: "pending"; readonly origin: Origin }
  | { readonly phase: "active"; readonly origin: Origin; readonly targetIndex: number };

const IDLE: MonthDragState = { phase: "idle" };
const PRIMARY_BUTTON = 0;

export interface UseMonthDragOptions {
  readonly gridRef: React.RefObject<HTMLElement | null>;
  readonly days: readonly Date[];
  readonly events: readonly CalendarEvent[];
  readonly onEventClick: (event: CalendarEvent) => void;
  readonly onCreateOnDay: (day: Date) => void;
  readonly onMove: (event: CalendarEvent, start: Date, end: Date) => void;
}

export interface MonthDrag {
  readonly draggingId: string | undefined;
  readonly targetIndex: number | undefined;
  readonly handlers: {
    readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    readonly onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    readonly onPointerCancel: () => void;
  };
}

export function useMonthDrag({
  gridRef,
  days,
  events,
  onEventClick,
  onCreateOnDay,
  onMove,
}: UseMonthDragOptions): MonthDrag {
  // Tracked in a ref and mirrored into state, for the reason useGridDrag
  // gives: callbacks must fire from the handler, not from a state updater.
  const [state, setState] = useState<MonthDragState>(IDLE);
  const gesture = useRef<MonthDragState>(IDLE);
  const commit = useCallback((next: MonthDragState) => {
    gesture.current = next;
    setState(next);
  }, []);

  const locate = useCallback(
    (clientX: number, clientY: number): number | null => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const rows = Math.ceil(days.length / DAYS_PER_WEEK);
      const column = Math.floor((clientX - rect.left) / (rect.width / DAYS_PER_WEEK));
      const row = Math.floor((clientY - rect.top) / (rect.height / rows));
      const index = row * DAYS_PER_WEEK + column;
      return Math.min(days.length - 1, Math.max(0, index));
    },
    [days.length, gridRef],
  );

  const onPointerDown = useCallback(
    (pointer: ReactPointerEvent<HTMLElement>) => {
      if (pointer.button !== PRIMARY_BUTTON) return;
      const element = pointer.target instanceof Element ? pointer.target : null;
      // Buttons inside a cell (the day number, "+n more") handle their own clicks.
      if (element?.closest("button")) return;
      const dayIndex = locate(pointer.clientX, pointer.clientY);
      if (dayIndex === null) return;

      const id = element?.closest<HTMLElement>("[data-event-id]")?.dataset.eventId;
      const event = id ? (events.find((candidate) => candidate.id === id) ?? null) : null;
      if (event && !event.readOnly) pointer.currentTarget.setPointerCapture(pointer.pointerId);

      commit({
        phase: "pending",
        origin: { event, dayIndex, clientX: pointer.clientX, clientY: pointer.clientY },
      });
    },
    [commit, events, locate],
  );

  const onPointerMove = useCallback(
    (pointer: ReactPointerEvent<HTMLElement>) => {
      const current = gesture.current;
      if (current.phase === "idle") return;
      const targetIndex = locate(pointer.clientX, pointer.clientY);
      if (targetIndex === null) return;

      if (current.phase === "pending") {
        const { event, clientX, clientY } = current.origin;
        const canDrag = event !== null && !event.readOnly;
        const moved = hasMovedPastThreshold(pointer.clientX - clientX, pointer.clientY - clientY);
        if (!canDrag || !moved) return;
        commit({ phase: "active", origin: current.origin, targetIndex });
        return;
      }
      commit({ ...current, targetIndex });
    },
    [commit, locate],
  );

  const finish = useCallback(
    (current: MonthDragState) => {
      if (current.phase === "pending") {
        if (current.origin.event) onEventClick(current.origin.event);
        else onCreateOnDay(days[current.origin.dayIndex]);
        return;
      }
      if (current.phase !== "active" || !current.origin.event) return;

      const event = current.origin.event;
      const delta = differenceInCalendarDays(days[current.targetIndex], startOfDay(event.start));
      if (delta === 0) return;
      onMove(event, addDays(event.start, delta), addDays(event.end, delta));
    },
    [days, onCreateOnDay, onEventClick, onMove],
  );

  const onPointerUp = useCallback(
    (pointer: ReactPointerEvent<HTMLElement>) => {
      if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) {
        pointer.currentTarget.releasePointerCapture(pointer.pointerId);
      }
      const current = gesture.current;
      commit(IDLE);
      finish(current);
    },
    [commit, finish],
  );

  const onPointerCancel = useCallback(() => commit(IDLE), [commit]);

  return {
    draggingId: state.phase === "active" ? state.origin.event?.id : undefined,
    targetIndex: state.phase === "active" ? state.targetIndex : undefined,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
