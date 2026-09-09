import { describe, expect, it } from "vitest";

import {
  chunkWeeks,
  lastDayOf,
  layoutWeekSegments,
  monthGridDays,
  spansMultipleDays,
  timedEventsOnDay,
  touchesDay,
} from "@/lib/calendar/month-grid";
import { allDayEvent, at, makeEvent } from "../helpers/calendar-events";

/** Monday 31 August to Sunday 6 September 2026: the first row of September's grid. */
const FIRST_WEEK = [31, 32, 33, 34, 35, 36, 37].map((day) => new Date(2026, 7, day));

describe("monthGridDays", () => {
  it("pads September 2026 out to whole Monday-first weeks", () => {
    const days = monthGridDays(new Date(2026, 8, 15));

    expect(days).toHaveLength(35);
    expect(days[0].getTime()).toBe(new Date(2026, 7, 31).getTime());
    expect(days[34].getTime()).toBe(new Date(2026, 9, 4).getTime());
  });

  it("chunks into rows of seven", () => {
    const weeks = chunkWeeks(monthGridDays(new Date(2026, 8, 15)));

    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});

describe("lastDayOf", () => {
  it("is the same day for a one-day all-day event", () => {
    expect(lastDayOf(allDayEvent("a", 4)).getTime()).toBe(new Date(2026, 8, 4).getTime());
  });

  it("treats a timed event ending at midnight as ending the day before", () => {
    const film = makeEvent({ id: "film", start: at(4, 21), end: at(5, 0) });
    expect(lastDayOf(film).getTime()).toBe(new Date(2026, 8, 4).getTime());
  });

  it("carries a timed event that crosses midnight into the next day", () => {
    const party = makeEvent({ id: "party", start: at(4, 22), end: at(5, 2) });
    expect(lastDayOf(party).getTime()).toBe(new Date(2026, 8, 5).getTime());
  });

  it("never ends before it starts", () => {
    const inverted = makeEvent({ id: "x", allDay: true, start: at(6, 0), end: at(4, 0) });
    expect(lastDayOf(inverted).getTime()).toBe(new Date(2026, 8, 6).getTime());
  });
});

describe("spansMultipleDays", () => {
  it("is false for a single day and true for a run of days", () => {
    expect(spansMultipleDays(allDayEvent("one", 4))).toBe(false);
    expect(spansMultipleDays(allDayEvent("trip", 4, 6))).toBe(true);
    expect(spansMultipleDays(makeEvent({ id: "late", start: at(4, 22), end: at(5, 2) }))).toBe(true);
    expect(spansMultipleDays(makeEvent({ id: "film", start: at(4, 21), end: at(5, 0) }))).toBe(false);
  });
});

describe("touchesDay", () => {
  it("covers every day from first to last, inclusive", () => {
    const trip = allDayEvent("trip", 4, 6);
    expect(touchesDay(trip, new Date(2026, 8, 3))).toBe(false);
    expect(touchesDay(trip, new Date(2026, 8, 4))).toBe(true);
    expect(touchesDay(trip, new Date(2026, 8, 6, 15))).toBe(true);
    expect(touchesDay(trip, new Date(2026, 8, 7))).toBe(false);
  });
});

describe("layoutWeekSegments", () => {
  it("places a mid-week all-day run at the right columns", () => {
    const [segment] = layoutWeekSegments([allDayEvent("trip", 2, 4)], FIRST_WEEK);

    expect(segment).toMatchObject({
      startCol: 2,
      span: 3,
      continuesBefore: false,
      continuesAfter: false,
      lane: 0,
    });
  });

  it("clips runs that start before or end after the row and says so", () => {
    const before = makeEvent({
      id: "before",
      allDay: true,
      start: new Date(2026, 7, 30),
      end: new Date(2026, 8, 1),
    });
    const after = allDayEvent("after", 5, 8);
    const segments = layoutWeekSegments([before, after], FIRST_WEEK);

    expect(segments[0]).toMatchObject({ startCol: 0, span: 2, continuesBefore: true });
    expect(segments[1]).toMatchObject({ startCol: 5, span: 2, continuesAfter: true });
  });

  it("stacks overlapping bars into lanes and reuses a freed lane", () => {
    const segments = layoutWeekSegments(
      [allDayEvent("a", 1, 3), allDayEvent("b", 2, 2), allDayEvent("c", 4, 5)],
      FIRST_WEEK,
    );
    const laneOf = (id: string) => segments.find((segment) => segment.event.id === id)?.lane;

    expect(laneOf("a")).toBe(0);
    expect(laneOf("b")).toBe(1);
    expect(laneOf("c")).toBe(0);
  });

  it("includes timed events that cross midnight and skips single-day timed ones", () => {
    const late = makeEvent({ id: "late", start: at(4, 22), end: at(5, 2) });
    const lunch = makeEvent({ id: "lunch", start: at(4, 12), end: at(4, 13) });

    expect(layoutWeekSegments([late, lunch], FIRST_WEEK).map((segment) => segment.event.id)).toEqual([
      "late",
    ]);
  });

  it("ignores events entirely outside the row", () => {
    expect(layoutWeekSegments([allDayEvent("later", 20, 22)], FIRST_WEEK)).toEqual([]);
  });
});

describe("timedEventsOnDay", () => {
  it("lists single-day timed events in start order only", () => {
    const events = [
      makeEvent({ id: "lunch", start: at(4, 12), end: at(4, 13) }),
      makeEvent({ id: "breakfast", start: at(4, 8), end: at(4, 9) }),
      allDayEvent("holiday", 4),
      makeEvent({ id: "late", start: at(4, 22), end: at(5, 2) }),
    ];

    expect(timedEventsOnDay(events, new Date(2026, 8, 4)).map((event) => event.id)).toEqual([
      "breakfast",
      "lunch",
    ]);
  });
});
