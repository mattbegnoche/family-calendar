import "server-only";

import { prisma } from "@/lib/prisma";

export interface EventWindow {
  from: Date;
  to: Date;
}

export interface EventInput {
  title: string;
  memberId: string;
  startsAt: Date;
  endsAt: Date;
  allDay?: boolean;
  description?: string | null;
  location?: string | null;
}

const EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  allDay: true,
  memberId: true,
  member: { select: { slug: true, name: true, color: true } },
} as const;

export type EventRecord = Awaited<ReturnType<typeof listEvents>>[number];

/**
 * Events overlapping a window — NOT contained by it, or a meeting spanning the
 * boundary would disappear. Hence `startsAt < to AND endsAt > from`.
 */
export async function listEvents(householdId: string, window: EventWindow) {
  return prisma.event.findMany({
    where: {
      householdId,
      startsAt: { lt: window.to },
      endsAt: { gt: window.from },
    },
    orderBy: { startsAt: "asc" },
    select: EVENT_SELECT,
  });
}

export async function createEvent(
  householdId: string,
  createdById: string | null,
  input: EventInput,
) {
  return prisma.event.create({
    data: {
      householdId,
      createdById,
      title: input.title,
      memberId: input.memberId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: input.allDay ?? false,
      description: input.description ?? null,
      location: input.location ?? null,
    },
    select: EVENT_SELECT,
  });
}

/** Scoped by householdId so one household can never edit another's events. */
export async function updateEvent(
  householdId: string,
  eventId: string,
  input: Partial<EventInput>,
) {
  const result = await prisma.event.updateMany({
    where: { id: eventId, householdId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.memberId !== undefined && { memberId: input.memberId }),
      ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
      ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
      ...(input.allDay !== undefined && { allDay: input.allDay }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.location !== undefined && { location: input.location }),
    },
  });
  if (result.count === 0) throw new Error(`No event ${eventId} in this household`);
}

export async function deleteEvent(householdId: string, eventId: string) {
  const result = await prisma.event.deleteMany({ where: { id: eventId, householdId } });
  if (result.count === 0) throw new Error(`No event ${eventId} in this household`);
}
