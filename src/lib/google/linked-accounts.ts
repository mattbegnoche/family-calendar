import "server-only";

import { prisma } from "@/lib/prisma";
import { listGoogleCalendars, type GoogleCalendarListEntry } from "@/lib/google/calendars";
import { getGoogleAccessToken } from "@/lib/google/tokens";

export interface LinkedAccount {
  id: string;
  /** The account's own address, taken from its primary calendar. */
  email: string;
  calendars: GoogleCalendarListEntry[];
  error?: string;
}

/** Linked Google accounts plus the calendars each one can see. */
export async function getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  const accounts = await prisma.account.findMany({
    where: { userId, provider: "google" },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return Promise.all(
    accounts.map(async (account): Promise<LinkedAccount> => {
      try {
        const accessToken = await getGoogleAccessToken(account.id);
        const calendars = await listGoogleCalendars(accessToken);
        const primary = calendars.find((calendar) => calendar.primary);
        return {
          id: account.id,
          email: primary?.id ?? "(unknown account)",
          calendars,
        };
      } catch (error: unknown) {
        console.error("Failed to read linked account", account.id, error);
        return {
          id: account.id,
          email: "(unavailable)",
          calendars: [],
          error:
            error instanceof Error ? error.message : "Could not reach Google.",
        };
      }
    }),
  );
}
