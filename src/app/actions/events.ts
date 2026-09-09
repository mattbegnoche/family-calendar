"use server";

import { revalidatePath } from "next/cache";

import { toCalendarEvent } from "@/lib/adapters/calendar";
import { isGoogleEventId, parseLocalEventId, readOnlyReason } from "@/lib/calendar-ids";
import { createEvent, deleteEvent, updateEvent } from "@/lib/events";
import { createGoogleEvent, removeGoogleEvent, updateGoogleEvent } from "@/lib/google/edit-events";
import { requireHousehold } from "@/lib/household";
import type { Member } from "@/lib/household";

const MAX_TITLE_LENGTH = 200;
const CALENDAR_PATH = "/calendar";

/**
 * Calendar ids are namespaced by source (see src/lib/calendar-ids.ts) so the
 * kinds can share one grid. Local events are edited here; Google events go
 * through src/lib/google/edit-events.ts, which re-checks who may touch them;
 * everything else is refused. The client refuses first; this is the check
 * that holds when a request bypasses the client.
 */
function parseEventId(calendarEventId: string): string {
  const eventId = parseLocalEventId(calendarEventId);
  if (eventId === null) {
    throw new Error(readOnlyReason(calendarEventId) ?? "Only calendar events can be edited here.");
  }
  return eventId;
}

/** The calendar's `calendarId` is our member slug, not the member's id. */
function memberIdFromSlug(members: readonly Member[], slug: string | undefined): string {
  const member = slug
    ? members.find((candidate) => candidate.slug === slug)
    : members[0];
  if (!member) throw new Error(`No household member for "${slug}".`);
  return member.id;
}

function assertValidRange(startsAt: Date, endsAt: Date): void {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("That event has an invalid date.");
  }
  if (endsAt < startsAt) throw new Error("An event cannot end before it starts.");
}

/** A blank field clears the column rather than being ignored. */
function optionalText(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value.trim() || null;
}

function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("An event needs a title.");
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(`Keep the title under ${MAX_TITLE_LENGTH} characters.`);
  }
  return trimmed;
}

export interface NewEventInput {
  title: string;
  calendarId?: string;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  /** Create in this connected Google calendar rather than the family's own. */
  googleConnectionId?: string;
}

export async function addEvent(input: NewEventInput) {
  const { household, userId } = await requireHousehold();
  assertValidRange(input.startsAt, input.endsAt);

  if (input.googleConnectionId) {
    const created = await createGoogleEvent(
      household.id,
      userId,
      household.timeZone,
      input.googleConnectionId,
      {
        title: assertValidTitle(input.title),
        description: input.description,
        location: input.location,
        start: input.startsAt,
        end: input.endsAt,
        allDay: input.allDay ?? false,
      },
    );
    revalidatePath(CALENDAR_PATH);
    return created;
  }

  const saved = await createEvent(household.id, userId, {
    title: assertValidTitle(input.title),
    memberId: memberIdFromSlug(household.members, input.calendarId),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: input.allDay ?? false,
    description: optionalText(input.description) ?? null,
    location: optionalText(input.location) ?? null,
  });

  revalidatePath(CALENDAR_PATH);
  return toCalendarEvent(saved);
}

export interface EditEventInput {
  title?: string;
  calendarId?: string;
  startsAt?: Date;
  endsAt?: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
}

export async function editEvent(calendarEventId: string, input: EditEventInput) {
  const { household, userId } = await requireHousehold();
  if (input.startsAt && input.endsAt) assertValidRange(input.startsAt, input.endsAt);

  if (isGoogleEventId(calendarEventId)) {
    await updateGoogleEvent(household.id, userId, household.timeZone, calendarEventId, {
      ...(input.title !== undefined && { title: assertValidTitle(input.title) }),
      description: input.description,
      location: input.location,
      start: input.startsAt,
      end: input.endsAt,
      allDay: input.allDay,
    });
    revalidatePath(CALENDAR_PATH);
    return;
  }

  await updateEvent(household.id, parseEventId(calendarEventId), {
    ...(input.title !== undefined && { title: assertValidTitle(input.title) }),
    ...(input.calendarId !== undefined && {
      memberId: memberIdFromSlug(household.members, input.calendarId),
    }),
    ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
    ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
    ...(input.allDay !== undefined && { allDay: input.allDay }),
    ...(input.description !== undefined && { description: optionalText(input.description) }),
    ...(input.location !== undefined && { location: optionalText(input.location) }),
  });

  revalidatePath(CALENDAR_PATH);
}

/**
 * Drag-to-move and edge-resize both reduce to restating start and end. A drop
 * onto another member's column in the People view also restates the member —
 * for a local event; a Google event's column is its calendar's, and stays.
 */
export async function moveEvent(
  calendarEventId: string,
  startsAt: Date,
  endsAt: Date,
  calendarId?: string,
  allDay?: boolean,
) {
  const { household, userId } = await requireHousehold();
  assertValidRange(startsAt, endsAt);

  if (isGoogleEventId(calendarEventId)) {
    await updateGoogleEvent(household.id, userId, household.timeZone, calendarEventId, {
      start: startsAt,
      end: endsAt,
      allDay: allDay ?? false,
    });
    revalidatePath(CALENDAR_PATH);
    return;
  }

  await updateEvent(household.id, parseEventId(calendarEventId), {
    startsAt,
    endsAt,
    ...(calendarId !== undefined && {
      memberId: memberIdFromSlug(household.members, calendarId),
    }),
  });
  revalidatePath(CALENDAR_PATH);
}

export async function removeEvent(calendarEventId: string) {
  const { household, userId } = await requireHousehold();
  if (isGoogleEventId(calendarEventId)) {
    await removeGoogleEvent(household.id, userId, calendarEventId);
  } else {
    await deleteEvent(household.id, parseEventId(calendarEventId));
  }
  revalidatePath(CALENDAR_PATH);
}
