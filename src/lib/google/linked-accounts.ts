import "server-only";

import { UserFacingError } from "@/lib/errors";
import { listGoogleCalendars } from "@/lib/google/calendars";
import { describeGoogleFailure } from "@/lib/google/errors";
import { hasGoogleCalendarScope } from "@/lib/google/scopes";
import { getGoogleAccessToken } from "@/lib/google/tokens";
import type {
  GoogleCalendarListEntry,
  GoogleCalendarOption,
  LinkedGoogleAccount,
} from "@/lib/google/types";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in user's Google accounts that granted calendar access, and what
 * each can see. This is what the connect picker in Settings is built from.
 */

export type { GoogleCalendarOption, LinkedGoogleAccount };

const GOOGLE_PROVIDER = "google";
const UNKNOWN_EMAIL = "(unknown account)";
/** Calendars shared as free/busy only: no titles, so nothing worth drawing. */
const FREE_BUSY_ROLE = "freeBusyReader";
const UNKNOWN_ROLE = "reader";

async function calendarScopedAccountIds(userId: string): Promise<string[]> {
  const accounts = await prisma.account.findMany({
    where: { userId, provider: GOOGLE_PROVIDER },
    select: { id: true, scope: true },
    orderBy: { id: "asc" },
  });
  return accounts
    .filter((account) => hasGoogleCalendarScope(account.scope))
    .map((account) => account.id);
}

interface AccountCalendars {
  email: string;
  calendars: GoogleCalendarListEntry[];
}

async function fetchAccountCalendars(accountId: string): Promise<AccountCalendars> {
  const accessToken = await getGoogleAccessToken(accountId);
  const calendars = await listGoogleCalendars(accessToken);
  const primary = calendars.find((calendar) => calendar.primary);
  return { email: primary?.id ?? UNKNOWN_EMAIL, calendars };
}

function isConnectable(entry: GoogleCalendarListEntry): boolean {
  return entry.accessRole !== FREE_BUSY_ROLE;
}

function toOption(entry: GoogleCalendarListEntry): GoogleCalendarOption {
  return {
    id: entry.id,
    name: entry.summaryOverride || entry.summary || entry.id,
    isPrimary: entry.primary === true,
    accessRole: entry.accessRole ?? UNKNOWN_ROLE,
  };
}

/** One account failing to answer must not hide the others. */
export async function listLinkedGoogleAccounts(
  userId: string,
): Promise<LinkedGoogleAccount[]> {
  const accountIds = await calendarScopedAccountIds(userId);

  return Promise.all(
    accountIds.map(async (id): Promise<LinkedGoogleAccount> => {
      try {
        const { email, calendars } = await fetchAccountCalendars(id);
        return {
          id,
          email,
          calendars: calendars.filter(isConnectable).map(toOption),
          error: null,
        };
      } catch (error) {
        console.error("[google-calendar] could not list calendars for account", id, error);
        return { id, email: UNKNOWN_EMAIL, calendars: [], error: describeGoogleFailure(error) };
      }
    }),
  );
}

export interface ResolvedCalendar {
  accountEmail: string;
  calendar: GoogleCalendarOption;
}

/**
 * A calendar the caller may connect. The account must be theirs and carry the
 * calendar scopes, and Google must confirm the calendar is visible to it —
 * the form's option list is not trusted, it is re-derived.
 */
export async function resolveConnectableCalendar(
  userId: string,
  accountId: string,
  googleCalendarId: string,
): Promise<ResolvedCalendar> {
  const accountIds = await calendarScopedAccountIds(userId);
  if (!accountIds.includes(accountId)) {
    throw new UserFacingError("Connect a Google account first.");
  }

  let account: AccountCalendars;
  try {
    account = await fetchAccountCalendars(accountId);
  } catch (error) {
    console.error("[google-calendar] could not verify calendar", accountId, error);
    throw new UserFacingError(describeGoogleFailure(error));
  }

  const entry = account.calendars.find((calendar) => calendar.id === googleCalendarId);
  if (!entry || !isConnectable(entry)) {
    throw new UserFacingError("That calendar isn't available to this Google account.");
  }

  return { accountEmail: account.email, calendar: toOption(entry) };
}
