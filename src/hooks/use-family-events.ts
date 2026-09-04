"use client";

import { useCallback, useState } from "react";
import type { CalendarEvent } from "calendarkit-pro";
import { memberColor, SHARED_MEMBER_ID } from "@/lib/family";

const UNTITLED_EVENT = "Untitled event";

/**
 * crypto.randomUUID needs a secure context, which plain http on a LAN or a
 * self-hosted box without TLS will not provide.
 */
const ID_RANDOM_RANGE = 1e9;

function createEventId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.floor(Math.random() * ID_RANDOM_RANGE)}`;
}

/**
 * Every operation returns a new array — events are never mutated in place.
 *
 * `initialEvents` seeds the client from whatever the server fetched. Edits are
 * local-only for now; writing back to Google is a later step.
 */
export function useFamilyEvents(initialEvents: readonly CalendarEvent[] = []) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => [...initialEvents]);

  const createEvent = useCallback((draft: Partial<CalendarEvent>) => {
    if (!draft.start || !draft.end) {
      console.warn("Ignoring event with no start or end", draft);
      return;
    }
    const calendarId = draft.calendarId ?? SHARED_MEMBER_ID;
    const created: CalendarEvent = {
      ...draft,
      id: createEventId(),
      title: draft.title?.trim() || UNTITLED_EVENT,
      calendarId,
      // CalendarKit only fills this in when the calendar dropdown is used, so a
      // quick-created event would otherwise render in the generic accent color.
      color: draft.color ?? memberColor(calendarId),
      start: draft.start,
      end: draft.end,
    };
    setEvents((previous) => [...previous, created]);
  }, []);

  const updateEvent = useCallback((updated: CalendarEvent) => {
    const recolored: CalendarEvent = {
      ...updated,
      color: updated.color ?? memberColor(updated.calendarId),
    };
    setEvents((previous) =>
      previous.map((event) => (event.id === recolored.id ? recolored : event)),
    );
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setEvents((previous) => previous.filter((event) => event.id !== eventId));
  }, []);

  /** Shared by drag-to-move and edge-resize; both just restate start and end. */
  const rescheduleEvent = useCallback(
    (moved: CalendarEvent, start: Date, end: Date) => {
      setEvents((previous) =>
        previous.map((event) =>
          event.id === moved.id ? { ...event, start, end } : event,
        ),
      );
    },
    [],
  );

  return { events, createEvent, updateEvent, deleteEvent, rescheduleEvent };
}
