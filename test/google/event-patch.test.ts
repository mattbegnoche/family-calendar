import { describe, expect, it } from "vitest";

import { toGoogleEventInsert, toGoogleEventPatch } from "@/lib/google/event-patch";
import { zonedDateTime } from "@/lib/time-zones";

const ZONE = "America/Chicago";
const chicago = (month: number, day: number, hour = 0) =>
  zonedDateTime({ year: 2026, month, day, hour, minute: 0 }, ZONE);

describe("toGoogleEventPatch", () => {
  it("patches only what was given and clears blanks", () => {
    expect(toGoogleEventPatch({ title: "Dentist", description: "", location: "Main St" }, ZONE)).toEqual({
      summary: "Dentist",
      description: null,
      location: "Main St",
    });
    expect(toGoogleEventPatch({}, ZONE)).toEqual({});
  });

  it("sends timed events as instants and nulls the all-day field", () => {
    const patch = toGoogleEventPatch({ start: chicago(9, 10, 14), end: chicago(9, 10, 15) }, ZONE);
    expect(patch.start).toEqual({ dateTime: "2026-09-10T19:00:00.000Z", date: null });
    expect(patch.end).toEqual({ dateTime: "2026-09-10T20:00:00.000Z", date: null });
  });

  it("sends all-day events as household dates with an exclusive end", () => {
    const patch = toGoogleEventPatch(
      { start: chicago(9, 4), end: chicago(9, 6), allDay: true },
      ZONE,
    );
    expect(patch.start).toEqual({ date: "2026-09-04", dateTime: null });
    expect(patch.end).toEqual({ date: "2026-09-07", dateTime: null });
  });

  it("makes a one-day all-day event end the following day", () => {
    const patch = toGoogleEventPatch({ start: chicago(9, 4), end: chicago(9, 4), allDay: true }, ZONE);
    expect(patch.end).toEqual({ date: "2026-09-05", dateTime: null });
  });

  it("builds an insert body with no nulls in it", () => {
    const body = toGoogleEventInsert(
      { title: "Swim", description: "", start: chicago(9, 4), end: chicago(9, 4), allDay: true },
      ZONE,
    );
    expect(body).toEqual({
      summary: "Swim",
      start: { date: "2026-09-04" },
      end: { date: "2026-09-05" },
    });
  });

  it("ignores a start without an end", () => {
    expect(toGoogleEventPatch({ start: chicago(9, 4) }, ZONE)).toEqual({});
  });
});
