import "server-only";

import { parseGoogleEventId } from "@/lib/calendar-ids";
import type { CalendarEvent } from "@/lib/calendar/types";
import { UserFacingError } from "@/lib/errors";
import { EDITABILITY_NOTE, googleEditability } from "@/lib/google/editability";
import { describeGoogleFailure } from "@/lib/google/errors";
import { toGoogleEventInsert, toGoogleEventPatch, type GoogleEventChanges } from "@/lib/google/event-patch";
import { deleteGoogleEvent, insertGoogleEvent, patchGoogleEvent } from "@/lib/google/events";
import { toCalendarEvent } from "@/lib/google/to-calendar-events";
import { getGoogleAccessToken } from "@/lib/google/tokens";
import { prisma } from "@/lib/prisma";

/**
 * Writing back to Google.
 *
 * The rule is re-derived here from the database, never taken from the
 * client: the connection must belong to the caller's household, the linked
 * account must be the caller's own, and that account must hold the write
 * scope. A forged id, or another member's event, fails before any token is
 * touched.
 */

interface WritableConnection {
  readonly accountId: string;
  readonly googleCalendarId: string;
  readonly googleId: string;
}

async function writableConnection(
  householdId: string,
  userId: string,
  calendarEventId: string,
): Promise<WritableConnection> {
  const ref = parseGoogleEventId(calendarEventId);
  if (!ref) throw new UserFacingError("That is not a Google Calendar event.");

  const connection = await prisma.calendarConnection.findFirst({
    where: { id: ref.connectionId, householdId },
    select: {
      googleCalendarId: true,
      account: { select: { id: true, userId: true, scope: true } },
    },
  });
  if (!connection) throw new UserFacingError("That calendar is no longer connected.");

  const editability = googleEditability(connection.account, userId);
  if (editability !== "editable") throw new UserFacingError(EDITABILITY_NOTE[editability]);

  return {
    accountId: connection.account.id,
    googleCalendarId: connection.googleCalendarId,
    googleId: ref.googleId,
  };
}

/** Google's failures become one sentence for the person who made the change; the detail is logged. */
async function withGoogle<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[google-calendar] ${operation} failed`, error);
    throw new UserFacingError(describeGoogleFailure(error));
  }
}

/**
 * Create an event in one of the caller's own connected calendars. Returns it
 * as the grid will draw it once Google has it, so the client can swap its
 * placeholder without waiting for the next import.
 */
export async function createGoogleEvent(
  householdId: string,
  userId: string,
  timeZone: string,
  connectionId: string,
  changes: Required<Pick<GoogleEventChanges, "title" | "start" | "end" | "allDay">> &
    Pick<GoogleEventChanges, "description" | "location">,
): Promise<CalendarEvent> {
  const connection = await prisma.calendarConnection.findFirst({
    where: { id: connectionId, householdId },
    select: {
      id: true,
      googleCalendarId: true,
      summary: true,
      member: { select: { slug: true, color: true } },
      account: { select: { id: true, userId: true, scope: true } },
    },
  });
  if (!connection) throw new UserFacingError("That calendar is no longer connected.");

  const editability = googleEditability(connection.account, userId);
  if (editability !== "editable") throw new UserFacingError(EDITABILITY_NOTE[editability]);

  const created = await withGoogle("events.insert", async () => {
    const accessToken = await getGoogleAccessToken(connection.account.id);
    return insertGoogleEvent(
      accessToken,
      connection.googleCalendarId,
      toGoogleEventInsert(changes, timeZone),
    );
  });

  const event = toCalendarEvent(created, {
    connectionId: connection.id,
    calendarName: connection.summary,
    member: connection.member,
    timeZone,
    editability,
  });
  if (!event) throw new UserFacingError("Google saved the event but sent it back in a shape this app cannot draw.");
  return event;
}

export async function updateGoogleEvent(
  householdId: string,
  userId: string,
  timeZone: string,
  calendarEventId: string,
  changes: GoogleEventChanges,
): Promise<void> {
  const target = await writableConnection(householdId, userId, calendarEventId);
  const patch = toGoogleEventPatch(changes, timeZone);
  if (Object.keys(patch).length === 0) return;

  await withGoogle("events.patch", async () => {
    const accessToken = await getGoogleAccessToken(target.accountId);
    await patchGoogleEvent(accessToken, target.googleCalendarId, target.googleId, patch);
  });
}

export async function removeGoogleEvent(
  householdId: string,
  userId: string,
  calendarEventId: string,
): Promise<void> {
  const target = await writableConnection(householdId, userId, calendarEventId);
  await withGoogle("events.delete", async () => {
    const accessToken = await getGoogleAccessToken(target.accountId);
    await deleteGoogleEvent(accessToken, target.googleCalendarId, target.googleId);
  });
}
