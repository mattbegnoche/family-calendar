"use client";

import { useCallback, useState } from "react";

import { addEvent, editEvent, moveEvent as moveEventAction, removeEvent } from "@/app/actions/events";
import { pendingEventId, readOnlyReason } from "@/lib/calendar-ids";
import type { CalendarEvent, CalendarSource, EventDraft } from "@/lib/calendar/types";

const UNTITLED_EVENT = "Untitled event";
const ID_RANDOM_RANGE = 1e9;
/** Slate, for a draft whose member has no colour on record. */
const FALLBACK_COLOR = "#64748b";

/**
 * crypto.randomUUID needs a secure context, which plain http on a LAN or a
 * self-hosted box without TLS will not provide.
 */
function createPendingId(): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * ID_RANDOM_RANGE)}`;
  return pendingEventId(random);
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * Calendar events backed by the database.
 *
 * Every mutation is optimistic: local state changes immediately so the grid
 * feels instant, and the previous state is restored if the server rejects it.
 * Read-only events (tasks, Google) are refused before anything is sent, with
 * the reason shown, so the grid never pretends a change stuck.
 */
export function useFamilyEvents(
  initialEvents: readonly CalendarEvent[],
  sources: readonly CalendarSource[],
) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => [...initialEvents]);
  const [error, setError] = useState<string | null>(null);

  // The server re-renders the page after every action (revalidatePath) and
  // whenever a Google calendar is connected or removed. Its list is the
  // truth; adopting it keeps the grid from drifting. Done during render, the
  // way React documents "adjusting state when a prop changes", rather than in
  // an effect that would paint the stale list first.
  const [adoptedEvents, setAdoptedEvents] = useState(initialEvents);
  if (adoptedEvents !== initialEvents) {
    setAdoptedEvents(initialEvents);
    setEvents([...initialEvents]);
  }

  const colorFor = useCallback(
    (calendarId: string) =>
      sources.find((source) => source.id === calendarId)?.color ?? FALLBACK_COLOR,
    [sources],
  );

  /** Returns false — and shows why — when the event may not be changed here. */
  const assertEditable = useCallback((eventId: string): boolean => {
    const reason = readOnlyReason(eventId);
    if (reason) setError(reason);
    return reason === null;
  }, []);

  const createEvent = useCallback(
    async (draft: EventDraft) => {
      const pendingId = createPendingId();
      const optimistic: CalendarEvent = {
        ...draft,
        id: pendingId,
        title: draft.title.trim() || UNTITLED_EVENT,
        color: colorFor(draft.calendarId),
        source: "local",
        readOnly: false,
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
        // Swap the placeholder for the row the database created, so the id
        // and colour are authoritative from here on.
        setEvents((previous) =>
          previous.map((event) => (event.id === pendingId ? saved : event)),
        );
      } catch (caught: unknown) {
        setEvents((previous) => previous.filter((event) => event.id !== pendingId));
        setError(messageFor(caught));
      }
    },
    [colorFor],
  );

  const updateEvent = useCallback(
    async (eventId: string, draft: EventDraft) => {
      if (!assertEditable(eventId)) return;

      let rollback: CalendarEvent[] = [];
      setEvents((previous) => {
        rollback = previous;
        return previous.map((event) =>
          event.id === eventId
            ? { ...event, ...draft, title: draft.title.trim() || UNTITLED_EVENT, color: colorFor(draft.calendarId) }
            : event,
        );
      });
      setError(null);

      try {
        await editEvent(eventId, {
          title: draft.title,
          calendarId: draft.calendarId,
          startsAt: draft.start,
          endsAt: draft.end,
          allDay: draft.allDay,
          description: draft.description,
          location: draft.location,
        });
      } catch (caught: unknown) {
        setEvents(rollback);
        setError(messageFor(caught));
      }
    },
    [assertEditable, colorFor],
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!assertEditable(eventId)) return;

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
    },
    [assertEditable],
  );

  /** Drag-to-move, edge-resize and a drop onto another member's column. */
  const moveEvent = useCallback(
    async (moved: CalendarEvent, start: Date, end: Date, calendarId?: string) => {
      if (!assertEditable(moved.id)) return;

      let rollback: CalendarEvent[] = [];
      setEvents((previous) => {
        rollback = previous;
        return previous.map((event) =>
          event.id === moved.id
            ? {
                ...event,
                start,
                end,
                ...(calendarId ? { calendarId, color: colorFor(calendarId) } : {}),
              }
            : event,
        );
      });
      setError(null);

      try {
        await moveEventAction(moved.id, start, end, calendarId);
      } catch (caught: unknown) {
        setEvents(rollback);
        setError(messageFor(caught));
      }
    },
    [assertEditable, colorFor],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { events, error, dismissError, createEvent, updateEvent, deleteEvent, moveEvent };
}
