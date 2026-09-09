import "server-only";

import type { CalendarEvent } from "@/lib/calendar/types";
import type { EventWindow } from "@/lib/events";
import { googleEditability } from "@/lib/google/editability";
import { describeGoogleFailure } from "@/lib/google/errors";
import { listGoogleEvents } from "@/lib/google/events";
import { toCalendarEvents } from "@/lib/google/to-calendar-events";
import { calendarConnections } from "@/lib/google/connections";
import { getGoogleAccessToken } from "@/lib/google/tokens";

export interface GoogleImport {
  events: CalendarEvent[];
  /** One line per calendar that could not be read. The rest still render. */
  problems: string[];
}

export interface ImportHousehold {
  id: string;
  timeZone: string;
}

const EMPTY_IMPORT: GoogleImport = { events: [], problems: [] };

/** Prisma's code for "table does not exist": the migration has not run here. */
const PRISMA_MISSING_TABLE = "P2021";

function describeConnectionFailure(error: unknown): string {
  if (error instanceof Error && error.message.includes("predates")) {
    return `Google Calendar is unavailable: ${error.message}`;
  }
  if (error instanceof Error && "code" in error && error.code === PRISMA_MISSING_TABLE) {
    return "Google Calendar is unavailable: the database migration has not been applied.";
  }
  return "Google Calendar is unavailable right now.";
}

const CONNECTION_SELECT = {
  id: true,
  accountId: true,
  googleCalendarId: true,
  summary: true,
  accountEmail: true,
  member: { select: { slug: true, color: true } },
  // Who may edit: the account's owner, once it holds the write scope.
  account: { select: { userId: true, scope: true } },
} as const;

type ImportConnection = Awaited<
  ReturnType<typeof loadConnections>
>[number];

function loadConnections(householdId: string) {
  return calendarConnections().findMany({
    where: { householdId },
    select: CONNECTION_SELECT,
  });
}

function groupByAccount(
  connections: readonly ImportConnection[],
): Map<string, ImportConnection[]> {
  return connections.reduce((groups, connection) => {
    const group = groups.get(connection.accountId) ?? [];
    return new Map(groups).set(connection.accountId, [...group, connection]);
  }, new Map<string, ImportConnection[]>());
}

function problemLine(connection: ImportConnection, error: unknown): string {
  return `${connection.summary} (${connection.accountEmail}): ${describeGoogleFailure(error)}`;
}

function mergeImports(imports: readonly GoogleImport[]): GoogleImport {
  return {
    events: imports.flatMap((result) => result.events),
    problems: imports.flatMap((result) => result.problems),
  };
}

/**
 * One token per account, however many calendars it reads. Refreshing the same
 * refresh token concurrently would mint several access tokens and race to
 * store them, so the token is fetched once and shared by the calendar pulls.
 */
async function importAccount(
  accountId: string,
  connections: readonly ImportConnection[],
  timeZone: string,
  window: EventWindow,
  viewerId: string,
): Promise<GoogleImport> {
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(accountId);
  } catch (error) {
    console.error("[google-calendar] no access token for account", accountId, error);
    return {
      events: [],
      problems: connections.map((connection) => problemLine(connection, error)),
    };
  }

  const settled = await Promise.allSettled(
    connections.map(async (connection) => {
      const googleEvents = await listGoogleEvents({
        accessToken,
        calendarId: connection.googleCalendarId,
        timeMin: window.from,
        timeMax: window.to,
      });
      return toCalendarEvents(googleEvents, {
        connectionId: connection.id,
        calendarName: connection.summary,
        member: connection.member,
        timeZone,
        editability: googleEditability(connection.account, viewerId),
      });
    }),
  );

  return mergeImports(
    settled.map((result, index): GoogleImport => {
      if (result.status === "fulfilled") return { events: result.value, problems: [] };
      const connection = connections[index];
      console.error("[google-calendar] import failed", connection.id, result.reason);
      return { events: [], problems: [problemLine(connection, result.reason)] };
    }),
  );
}

/**
 * Every Google event the household's connected calendars hold in the window.
 *
 * Nothing is persisted: this reads straight through to Google on each
 * request, which is the simplest thing that is always fresh. Caching rows in
 * Postgres is the seam for a later step, and would hang off the same
 * CalendarConnection rows.
 */
export async function importGoogleEvents(
  household: ImportHousehold,
  window: EventWindow,
  /** The signed-in user: decides which Google events they may edit. */
  viewerId: string,
): Promise<GoogleImport> {
  let connections: ImportConnection[];
  try {
    connections = await loadConnections(household.id);
  } catch (error) {
    // A stale dev Prisma client or an unapplied migration. Either way the
    // calendar must still render, with a line that says which it was.
    console.error("[google-calendar] could not load connections", error);
    return { events: [], problems: [describeConnectionFailure(error)] };
  }
  if (connections.length === 0) return EMPTY_IMPORT;

  const imports = await Promise.all(
    [...groupByAccount(connections)].map(([accountId, group]) =>
      importAccount(accountId, group, household.timeZone, window, viewerId),
    ),
  );
  return mergeImports(imports);
}
