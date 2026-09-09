import "server-only";

import { UserFacingError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { googleEditability } from "@/lib/google/editability";
import type { WritableCalendarOption } from "@/lib/google/types";
import { prisma } from "@/lib/prisma";

/** CalendarConnection rows: which Google calendars a household shows, and how. */

/**
 * The CalendarConnection delegate, or a clear error when it is missing.
 *
 * In development the PrismaClient is cached on globalThis across hot reloads
 * (src/lib/prisma.ts). After `prisma generate` adds a model, that cached
 * instance predates it until the dev server restarts, and every call would
 * otherwise die with "Cannot read properties of undefined (reading
 * 'findMany')" — a message that points nowhere near the cause.
 */
export function calendarConnections() {
  const delegate = prisma.calendarConnection;
  if (!delegate) {
    throw new Error(
      "The Prisma client predates the CalendarConnection model. Restart the dev server (prisma generate has already run).",
    );
  }
  return delegate;
}


const CONNECTION_SELECT = {
  id: true,
  googleCalendarId: true,
  summary: true,
  accountEmail: true,
  createdAt: true,
  member: { select: { id: true, slug: true, name: true, color: true } },
  account: { select: { id: true, userId: true, scope: true } },
} as const;

export type CalendarConnectionRecord = Awaited<
  ReturnType<typeof listCalendarConnections>
>[number];

export async function listCalendarConnections(householdId: string) {
  return calendarConnections().findMany({
    where: { householdId },
    orderBy: [{ accountEmail: "asc" }, { summary: "asc" }],
    select: CONNECTION_SELECT,
  });
}

/** The household's connected calendars this user may write to: their own accounts, with the write scope. */
export async function listWritableConnections(
  householdId: string,
  userId: string,
): Promise<WritableCalendarOption[]> {
  const connections = await listCalendarConnections(householdId);
  return connections
    .filter((connection) => googleEditability(connection.account, userId) === "editable")
    .map((connection) => ({
      connectionId: connection.id,
      name: connection.summary,
      accountEmail: connection.accountEmail,
      memberSlug: connection.member.slug,
    }));
}

export interface NewCalendarConnection {
  readonly accountId: string;
  readonly memberId: string;
  readonly googleCalendarId: string;
  readonly summary: string;
  readonly accountEmail: string;
}

function isDuplicateConnection(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function createCalendarConnection(
  householdId: string,
  input: NewCalendarConnection,
) {
  try {
    return await calendarConnections().create({
      data: { householdId, ...input },
      select: CONNECTION_SELECT,
    });
  } catch (error) {
    // @@unique([householdId, googleCalendarId]): the other parent already
    // connected this calendar through their own account.
    if (isDuplicateConnection(error)) {
      throw new UserFacingError("That calendar is already connected to this family.");
    }
    throw error;
  }
}

export interface ConnectionActor {
  readonly userId: string;
  readonly isOwner: boolean;
}

/**
 * Owners may remove any of the household's calendars; everyone else only the
 * ones read through their own Google account. Both rules live in the WHERE
 * clause, so a forged id from another household matches nothing.
 */
export async function deleteCalendarConnection(
  householdId: string,
  connectionId: string,
  actor: ConnectionActor,
): Promise<void> {
  const result = await calendarConnections().deleteMany({
    where: {
      id: connectionId,
      householdId,
      ...(actor.isOwner ? {} : { account: { userId: actor.userId } }),
    },
  });

  if (result.count === 0) {
    throw new UserFacingError(
      "That calendar is no longer connected, or it isn't yours to remove.",
    );
  }
}
