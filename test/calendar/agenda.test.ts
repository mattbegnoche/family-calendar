import { describe, expect, it } from "vitest";

import { agendaDays } from "@/lib/calendar/agenda";
import { allDayEvent, at, makeEvent } from "../helpers/calendar-events";

const range = { from: new Date(2026, 8, 1), to: new Date(2026, 8, 8) };

describe("agendaDays", () => {
  it("groups events by day and leaves empty days out", () => {
    const days = agendaDays(
      [
        makeEvent({ id: "dentist", start: at(3, 14), end: at(3, 15) }),
        makeEvent({ id: "swim", start: at(5, 9), end: at(5, 10) }),
      ],
      range,
    );

    expect(days.map((day) => day.date.getDate())).toEqual([3, 5]);
  });

  it("lists a multi-day event on every day it covers", () => {
    const days = agendaDays([allDayEvent("trip", 2, 4)], range);

    expect(days.map((day) => day.date.getDate())).toEqual([2, 3, 4]);
  });

  it("puts all-day events before timed ones, then sorts by start", () => {
    const [day] = agendaDays(
      [
        makeEvent({ id: "lunch", start: at(3, 12), end: at(3, 13) }),
        allDayEvent("holiday", 3),
        makeEvent({ id: "breakfast", start: at(3, 8), end: at(3, 9) }),
      ],
      range,
    );

    expect(day.events.map((event) => event.id)).toEqual(["holiday", "breakfast", "lunch"]);
  });

  it("treats the end of the range as exclusive", () => {
    const days = agendaDays([allDayEvent("edge", 8)], range);

    expect(days).toEqual([]);
  });

  it("returns nothing for an empty range", () => {
    expect(agendaDays([allDayEvent("a", 1)], { from: range.from, to: range.from })).toEqual([]);
  });
});
