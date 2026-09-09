import "server-only";

import { GoogleApiError } from "@/lib/google/errors";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/**
 * One authenticated GET against the Calendar API.
 *
 * `cache: "no-store"` matters: Next would otherwise be free to memoise a
 * fetch keyed on URL and headers, and a calendar that stops updating for the
 * lifetime of a cache entry is a bug nobody would think to look for here.
 */
export async function googleCalendarGet<T>(
  accessToken: string,
  path: string,
  params: Record<string, string>,
  operation: string,
): Promise<T> {
  const url = new URL(`${GOOGLE_CALENDAR_API}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GoogleApiError(response.status, operation, await response.text());
  }

  return (await response.json()) as T;
}
