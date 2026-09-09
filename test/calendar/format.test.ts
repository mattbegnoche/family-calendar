import { describe, expect, it } from "vitest";

import { formatEventWhen, formatTime, formatTimeRange } from "@/lib/calendar/format";
import { allDayEvent, at, makeEvent } from "../helpers/calendar-events";

describe("formatTime", () => {
  it("drops the minutes on the hour", () => {
    expect(formatTime(at(10, 15))).toBe("3 PM");
    expect(formatTime(at(10, 15, 30))).toBe("3:30 PM");
  });
});

describe("formatTimeRange", () => {
  it("joins start and end with an en dash", () => {
    expect(formatTimeRange(at(10, 9), at(10, 10, 15))).toBe("9 AM – 10:15 AM");
  });
});

describe("formatEventWhen", () => {
  it("names the day for a one-day all-day event", () => {
    expect(formatEventWhen(allDayEvent("a", 10))).toBe("Thursday, September 10");
  });

  it("gives both days for a multi-day all-day event", () => {
    expect(formatEventWhen(allDayEvent("trip", 10, 12))).toBe("Thu, Sep 10 – Sat, Sep 12");
  });

  it("adds the time range for a timed event", () => {
    expect(formatEventWhen(makeEvent({ id: "a", start: at(10, 15), end: at(10, 16) }))).toBe(
      "Thursday, September 10 · 3 PM – 4 PM",
    );
  });

  it("spells out both ends of an overnight event", () => {
    expect(formatEventWhen(makeEvent({ id: "a", start: at(10, 22), end: at(11, 2) }))).toBe(
      "Thu, Sep 10, 10:00 PM – Fri, Sep 11, 2:00 AM",
    );
  });
});
