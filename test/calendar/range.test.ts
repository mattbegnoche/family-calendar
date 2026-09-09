import { describe, expect, it } from "vitest";

import { rangeTitle, stepDate, visibleRange } from "@/lib/calendar/range";

/** Thursday 10 September 2026. */
const focus = new Date(2026, 8, 10, 15);

describe("visibleRange", () => {
  it("covers the Monday-first week for the week view", () => {
    expect(visibleRange("week", focus)).toEqual({
      from: new Date(2026, 8, 7),
      to: new Date(2026, 8, 14),
    });
  });

  it("covers the padded grid for the month view", () => {
    expect(visibleRange("month", focus)).toEqual({
      from: new Date(2026, 7, 31),
      to: new Date(2026, 9, 5),
    });
  });

  it("covers one day for the day and people views", () => {
    const day = { from: new Date(2026, 8, 10), to: new Date(2026, 8, 11) };
    expect(visibleRange("day", focus)).toEqual(day);
    expect(visibleRange("resource", focus)).toEqual(day);
  });

  it("covers the calendar month for the agenda", () => {
    expect(visibleRange("agenda", focus)).toEqual({
      from: new Date(2026, 8, 1),
      to: new Date(2026, 9, 1),
    });
  });
});

describe("stepDate", () => {
  it("moves by the unit each view shows", () => {
    expect(stepDate("week", focus, 1).getDate()).toBe(17);
    expect(stepDate("day", focus, -1).getDate()).toBe(9);
    expect(stepDate("resource", focus, 1).getDate()).toBe(11);
    expect(stepDate("month", focus, 1).getMonth()).toBe(9);
    expect(stepDate("agenda", focus, -1).getMonth()).toBe(7);
  });
});

describe("rangeTitle", () => {
  it("names the month for month and agenda", () => {
    expect(rangeTitle("month", focus)).toBe("September 2026");
    expect(rangeTitle("agenda", focus)).toBe("September 2026");
  });

  it("spells out the day for day and people views", () => {
    expect(rangeTitle("day", focus)).toBe("Thursday, September 10, 2026");
    expect(rangeTitle("resource", focus)).toBe("Thursday, September 10, 2026");
  });

  it("compresses a week inside one month", () => {
    expect(rangeTitle("week", focus)).toBe("Sep 7 – 13, 2026");
  });

  it("names both months when a week straddles them", () => {
    expect(rangeTitle("week", new Date(2026, 8, 30))).toBe("Sep 28 – Oct 4, 2026");
  });

  it("names both years when a week straddles them", () => {
    expect(rangeTitle("week", new Date(2026, 11, 30))).toBe("Dec 28, 2026 – Jan 3, 2027");
  });
});
