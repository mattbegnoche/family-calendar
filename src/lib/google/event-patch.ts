import { wallClockIn } from "@/lib/time-zones";

/**
 * The body of a Google Calendar `events.patch`, built from what the app lets
 * someone change. Pure: the date handling is the part worth testing, and it
 * mirrors the import in reverse (see to-calendar-events.ts).
 */

export interface GoogleEventChanges {
  readonly title?: string;
  readonly description?: string;
  readonly location?: string;
  readonly start?: Date;
  readonly end?: Date;
  readonly allDay?: boolean;
}

interface GoogleDateField {
  readonly date?: string | null;
  readonly dateTime?: string | null;
}

export interface GoogleEventPatch {
  readonly summary?: string;
  readonly description?: string | null;
  readonly location?: string | null;
  readonly start?: GoogleDateField;
  readonly end?: GoogleDateField;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" of `instant` as the household's wall clock reads it. */
function calendarDateIn(instant: Date, timeZone: string): string {
  const clock = wallClockIn(instant, timeZone);
  return `${clock.year}-${String(clock.month).padStart(2, "0")}-${String(clock.day).padStart(2, "0")}`;
}

/** The calendar date after `isoDate`: Google's all-day end is exclusive. */
function nextCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Both start and end must be sent together, and the field the event is NOT
 * using is sent as null so a switch between timed and all-day clears the old
 * one — Google keeps whichever fields a PATCH does not mention.
 */
function dateFields(start: Date, end: Date, allDay: boolean, timeZone: string): Pick<GoogleEventPatch, "start" | "end"> {
  if (allDay) {
    const firstDay = calendarDateIn(start, timeZone);
    // This app's all-day end is midnight on the LAST day; Google's is the day after.
    const lastDay = end < start ? firstDay : calendarDateIn(end, timeZone);
    return {
      start: { date: firstDay, dateTime: null },
      end: { date: nextCalendarDate(lastDay), dateTime: null },
    };
  }
  return {
    start: { dateTime: start.toISOString(), date: null },
    end: { dateTime: end.toISOString(), date: null },
  };
}

/**
 * The body of `events.insert`: a patch with the clearing nulls left out, since
 * there is nothing to clear yet. Title, start and end are required by Google.
 */
export function toGoogleEventInsert(changes: GoogleEventChanges, timeZone: string): GoogleEventPatch {
  const patch = toGoogleEventPatch(changes, timeZone);
  const stripNulls = (field: GoogleDateField | undefined): GoogleDateField | undefined =>
    field && Object.fromEntries(Object.entries(field).filter(([, value]) => value !== null));
  return {
    ...(patch.summary !== undefined && { summary: patch.summary }),
    ...(patch.description ? { description: patch.description } : {}),
    ...(patch.location ? { location: patch.location } : {}),
    ...(patch.start && { start: stripNulls(patch.start) }),
    ...(patch.end && { end: stripNulls(patch.end) }),
  };
}

/** Only the fields that were given are patched; a blank string clears the field. */
export function toGoogleEventPatch(changes: GoogleEventChanges, timeZone: string): GoogleEventPatch {
  const hasTimes = changes.start !== undefined && changes.end !== undefined;
  return {
    ...(changes.title !== undefined && { summary: changes.title }),
    ...(changes.description !== undefined && { description: changes.description || null }),
    ...(changes.location !== undefined && { location: changes.location || null }),
    ...(hasTimes && dateFields(changes.start, changes.end, changes.allDay ?? false, timeZone)),
  };
}
