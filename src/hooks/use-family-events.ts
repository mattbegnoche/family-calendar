"use client";

import { useCallback, useState } from "react";
import type { CalendarEvent } from "calendarkit-pro";

import {
  addEvent,
  editEvent,
  moveEvent,
  removeEvent,
} from "@/app/actions/events";

const UNTITLED_EVENT = "Untitled event";
const ID_RANDOM_RANGE = 1e9;

/** Marks a row that exists only on the client while its save is in flight. */
const PENDING_PREFIX = "pending-";

/**
 * crypto.randomUUID needs a secure context, which plain http on a LAN or a
 * self-hosted box without TLS will not provide.
 */
function createPendingId(): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * ID_RANDOM_RANGE)}`;
  return `${PENDING_PREFIX}${random}`;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * Calendar events backed by the database.
 *
 * Every mutation is optimistic: local state changes immediately so the grid
 * feels instant, and the previous state is restored if the server rejects it.
 * Without the rollback a failed save would leave the screen disagreeing with
 * the database until a reload.
 *
 * Task-derived entries ("task-…") are read-only here; the server actions reject
 * them, and the rollback puts them back where they were.
 */
export function useFamilyEvents(initialEvents: readonly CalendarEvent[] = []) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => [...initialEvents]);
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCallback(async (draft: Partial<CalendarEvent>) => {
    if (!draft.start || !draft.end) {
      setError("That event needs a start and an end.");
      return;
    }

    const pendingId = createPendingId();
    const optimistic: CalendarEvent = {
      ...draft,
      id: pendingId,
      title: draft.title?.trim() || UNTITLED_EVENT,
      start: draft.start,
      end: draft.end,
    };
    setEvents((previous) => [...previous, optimistic]);
    setError(null);

    try {
      const saved = await addEvent({
        title: optimistic.title,
        calendarId: draft.calendarId,
        startsAt: draft.start,
        endsAt: draft.end,
        allDay: draft.allDay,
        description: draft.description,
        location: draft.location,
      });
      // Swap the placeholder for the row the database actually created, so the
      // id and colour are authoritative from here on.
      setEvents((previous) =>
        previous.map((event) => (event.id === pendingId ? saved : event)),
      );
    } catch (caught: unknown) {
      setEvents((previous) => previous.filter((event) => event.id !== pendingId));
      setError(messageFor(caught));
    }
  }, []);

  const updateEvent = useCallback(async (updated: CalendarEvent) => {
    let rollback: CalendarEvent[] = [];
    setEvents((previous) => {
      rollback = previous;
      return previous.map((event) => (event.id === updated.id ? updated : event));
    });
    setError(null);

    try {
      await editEvent(updated.id, {
        title: updated.title,
        calendarId: updated.calendarId,
        startsAt: updated.start,
        endsAt: updated.end,
        allDay: updated.allDay,
        description: updated.description,
        location: updated.location,
      });
    } catch (caught: unknown) {
      setEvents(rollback);
      setError(messageFor(caught));
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    let rollback: CalendarEvent[] = [];
    setEvents((previous) => {
      rollback = previous;
      return previous.filter((event) => event.id !== eventId);
    });
    setError(null);

    try {
      await removeEvent(eventId);
    } catch (caught: unknown) {
      setEvents(rollback);
      setError(messageFor(caught));
    }
  }, []);

  /** Shared by drag-to-move and edge-resize; both restate start and end. */
  const rescheduleEvent = useCallback(
    async (moved: CalendarEvent, start: Date, end: Date) => {
      let rollback: CalendarEvent[] = [];
      setEvents((previous) => {
        rollback = previous;
        return previous.map((event) =>
          event.id === moved.id ? { ...event, start, end } : event,
        );
      });
      setError(null);

      try {
        await moveEvent(moved.id, start, end);
      } catch (caught: unknown) {
        setEvents(rollback);
        setError(messageFor(caught));
      }
    },
    [],
  );

  const dismissError = useCallback(() => setError(null), []);

  return {
    events,
    error,
    dismissError,
    createEvent,
    updateEvent,
    deleteEvent,
    rescheduleEvent,
  };
}
