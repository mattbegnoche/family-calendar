"use server";

import { revalidatePath } from "next/cache";

import { toCalendarEvent } from "@/lib/adapters/calendar-kit";
import { createEvent, deleteEvent, updateEvent } from "@/lib/events";
import { requireHousehold } from "@/lib/household";
import type { Member } from "@/lib/household";

const MAX_TITLE_LENGTH = 200;

/**
 * CalendarKit ids are namespaced by the adapter ("event-…", "task-…") so the
 * two kinds can share one grid. Only events are editable here; a task that
 * happens to be rendered on the calendar must be edited from the tasks page.
 */
function parseEventId(calendarEventId: string): string {
  if (!calendarEventId.startsWith("event-")) {
    throw new Error("Only calendar events can be edited here.");
  }
  return calendarEventId.slice("event-".length);
}

/** CalendarKit's `calendarId` is our member slug, not the member's id. */
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
}

export async function addEvent(input: NewEventInput) {
  const { household, userId } = await requireHousehold();
  assertValidRange(input.startsAt, input.endsAt);

  const saved = await createEvent(household.id, userId, {
    title: assertValidTitle(input.title),
    memberId: memberIdFromSlug(household.members, input.calendarId),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: input.allDay ?? false,
    description: input.description ?? null,
    location: input.location ?? null,
  });

  revalidatePath("/calendar");
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
  const { household } = await requireHousehold();
  if (input.startsAt && input.endsAt) assertValidRange(input.startsAt, input.endsAt);

  await updateEvent(household.id, parseEventId(calendarEventId), {
    ...(input.title !== undefined && { title: assertValidTitle(input.title) }),
    ...(input.calendarId !== undefined && {
      memberId: memberIdFromSlug(household.members, input.calendarId),
    }),
    ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
    ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
    ...(input.allDay !== undefined && { allDay: input.allDay }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.location !== undefined && { location: input.location }),
  });

  revalidatePath("/calendar");
}

/** Drag-to-move and edge-resize both reduce to restating start and end. */
export async function moveEvent(calendarEventId: string, startsAt: Date, endsAt: Date) {
  const { household } = await requireHousehold();
  assertValidRange(startsAt, endsAt);
  await updateEvent(household.id, parseEventId(calendarEventId), { startsAt, endsAt });
  revalidatePath("/calendar");
}

export async function removeEvent(calendarEventId: string) {
  const { household } = await requireHousehold();
  await deleteEvent(household.id, parseEventId(calendarEventId));
  revalidatePath("/calendar");
}
