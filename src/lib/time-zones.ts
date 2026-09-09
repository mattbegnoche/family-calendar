/**
 * Time-zone helpers backed by the Intl database rather than a bundled list —
 * ~420 IANA zones, always current with the runtime, no dependency.
 *
 * Household.timeZone anchors all-day event boundaries, so a wrong or invalid
 * value shifts what "all day Tuesday" means for the whole family. That is why
 * this is validated on the server and never taken on trust from the form.
 */

let cachedZones: readonly string[] | null = null;

export function allTimeZones(): readonly string[] {
  cachedZones ??= Intl.supportedValuesOf("timeZone");
  return cachedZones;
}

export function isValidTimeZone(value: string): boolean {
  return allTimeZones().includes(value);
}

export const FALLBACK_TIME_ZONE = "America/New_York";

/**
 * The visitor's own zone, when the browser reports one we recognise. Used only
 * to preselect the picker — the server still validates whatever comes back.
 */
export function guessTimeZone(): string {
  try {
    const guess = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return guess && isValidTimeZone(guess) ? guess : FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

const formattersByZone = new Map<string, Intl.DateTimeFormat>();

function wallClockFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formattersByZone.get(timeZone);
  if (cached) return cached;
  // h23, not hour12:false: some engines print midnight as "24" under the
  // latter, which Date.UTC would happily roll into the next day.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formattersByZone.set(timeZone, formatter);
  return formatter;
}

const WALL_CLOCK_PARTS = ["year", "month", "day", "hour", "minute", "second"] as const;

/** Milliseconds `timeZone` is ahead of UTC at `instantMs`; negative in the Americas. */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const values = new Map(
    wallClockFormatter(timeZone)
      .formatToParts(new Date(instantMs))
      .map((part) => [part.type, Number(part.value)] as const),
  );
  const [year, month, day, hour, minute, second] = WALL_CLOCK_PARTS.map(
    (part) => values.get(part) ?? 0,
  );
  return Date.UTC(year, month - 1, day, hour, minute, second) - instantMs;
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The instant at which a calendar date begins in `timeZone`.
 *
 * Google all-day events arrive as bare "YYYY-MM-DD" strings with no zone.
 * `new Date("2026-09-04")` reads that as UTC midnight, which is still the 3rd
 * anywhere west of Greenwich, so the day has to be anchored in the household's
 * zone explicitly. The second pass covers the rare zone whose clock change
 * lands on midnight itself; a single pass would be an hour out on that day.
 */
export function zonedMidnight(isoDate: string, timeZone: string): Date {
  const match = CALENDAR_DATE.exec(isoDate);
  if (!match) throw new RangeError(`Not a calendar date: ${isoDate}`);
  const [year, month, day] = match.slice(1).map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day);
  const firstGuess = wallClockAsUtc - zoneOffsetMs(wallClockAsUtc, timeZone);
  return new Date(wallClockAsUtc - zoneOffsetMs(firstGuess, timeZone));
}
