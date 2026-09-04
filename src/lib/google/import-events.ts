import "server-only";

import type { CalendarEvent } from "calendarkit-pro";

import { prisma } from "@/lib/prisma";
import { listGoogleEvents } from "@/lib/google/calendar";
import { toCalendarEvents } from "@/lib/google/to-calendar-events";
import { getGoogleAccessToken } from "@/lib/google/tokens";

/** Generous enough that paging weeks in the UI needs no refetch. */
const DAYS_BACK = 30;
const DAYS_FORWARD = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ImportResult {
  events: CalendarEvent[];
  /** User-facing message when the pull failed; the calendar still renders. */
  error?: string;
}

/**
 * Every Google event this user can see, across all their linked accounts.
 *
 * Nothing is persisted yet — this reads straight through to Google on each
 * request. Caching in Postgres comes with the CalendarConnection models.
 */
export async function importGoogleEvents(userId: string): Promise<ImportResult> {
  const accounts = await prisma.account.findMany({
    where: { userId, provider: "google" },
    select: { id: true },
  });

  if (accounts.length === 0) {
    return { events: [], error: "No Google account is connected yet." };
  }

  const now = Date.now();
  const timeMin = new Date(now - DAYS_BACK * MS_PER_DAY);
  const timeMax = new Date(now + DAYS_FORWARD * MS_PER_DAY);

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const accessToken = await getGoogleAccessToken(account.id);
      return listGoogleEvents({ accessToken, timeMin, timeMax });
    }),
  );

  const events: CalendarEvent[] = [];
  const failures: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      events.push(...toCalendarEvents(result.value));
    } else {
      // Detail server-side; the UI gets the short message below.
      console.error("Google calendar import failed", result.reason);
      failures.push(
        result.reason instanceof Error ? result.reason.message : "Unknown error",
      );
    }
  }

  // One bad account shouldn't blank the calendar for the others.
  if (failures.length === accounts.length) {
    return { events: [], error: "Could not reach Google Calendar." };
  }

  return { events };
}
