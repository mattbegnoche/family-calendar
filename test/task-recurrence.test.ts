import { describe, expect, it } from "vitest";

import {
  currentOccurrence,
  describeRepeat,
  effectiveWeekdays,
  expandOccurrences,
  type RepeatRule,
} from "@/lib/task-recurrence";
import { zonedDateTime } from "@/lib/time-zones";

const ZONE = "America/Chicago";

/** A wall-clock instant in Chicago. */
function chicago(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return zonedDateTime({ year, month, day, hour, minute }, ZONE);
}

function rule(overrides: Partial<RepeatRule> & { frequency: RepeatRule["frequency"] }): RepeatRule {
  return { interval: 1, weekdays: [], until: null, ...overrides };
}

const iso = (dates: Date[]) => dates.map((date) => date.toISOString());

describe("expandOccurrences", () => {
  it("returns only the anchor when there is no rule", () => {
    const anchor = chicago(2026, 9, 10, 7);
    expect(expandOccurrences(anchor, null, { from: chicago(2026, 9, 1), to: chicago(2026, 9, 30) }, ZONE)).toEqual([anchor]);
    expect(expandOccurrences(anchor, null, { from: chicago(2026, 9, 11), to: chicago(2026, 9, 30) }, ZONE)).toEqual([]);
  });

  it("repeats daily at the same wall-clock time inside the window", () => {
    const occurrences = expandOccurrences(
      chicago(2026, 9, 10, 7),
      rule({ frequency: "DAILY" }),
      { from: chicago(2026, 9, 12), to: chicago(2026, 9, 15) },
      ZONE,
    );
    expect(iso(occurrences)).toEqual([
      "2026-09-12T12:00:00.000Z",
      "2026-09-13T12:00:00.000Z",
      "2026-09-14T12:00:00.000Z",
    ]);
  });

  it("keeps 7 am at 7 am across the clocks falling back", () => {
    const occurrences = expandOccurrences(
      chicago(2026, 10, 30, 7),
      rule({ frequency: "DAILY" }),
      { from: chicago(2026, 10, 31), to: chicago(2026, 11, 3) },
      ZONE,
    );
    // 1 November 2026 is the fall-back day: CDT (UTC-5) becomes CST (UTC-6).
    expect(iso(occurrences)).toEqual([
      "2026-10-31T12:00:00.000Z",
      "2026-11-01T13:00:00.000Z",
      "2026-11-02T13:00:00.000Z",
    ]);
  });

  it("honours an interval, counted from the anchor", () => {
    const occurrences = expandOccurrences(
      chicago(2026, 9, 10, 7),
      rule({ frequency: "DAILY", interval: 3 }),
      { from: chicago(2026, 9, 11), to: chicago(2026, 9, 20) },
      ZONE,
    );
    expect(occurrences.map((date) => date.getDate())).toEqual([13, 16, 19]);
  });

  it("repeats weekly on the chosen weekdays, from the anchor onward", () => {
    // 10 September 2026 is a Thursday; Monday and Wednesday chosen.
    const occurrences = expandOccurrences(
      chicago(2026, 9, 10, 7),
      rule({ frequency: "WEEKLY", weekdays: [1, 3] }),
      { from: chicago(2026, 9, 1), to: chicago(2026, 9, 25) },
      ZONE,
    );
    expect(occurrences.map((date) => date.getDate())).toEqual([14, 16, 21, 23]);
  });

  it("defaults weekly to the anchor's own weekday and counts weeks by the interval", () => {
    const occurrences = expandOccurrences(
      chicago(2026, 9, 10, 7),
      rule({ frequency: "WEEKLY", interval: 2 }),
      { from: chicago(2026, 9, 1), to: chicago(2026, 10, 15) },
      ZONE,
    );
    expect(occurrences.map((date) => `${date.getMonth() + 1}/${date.getDate()}`)).toEqual([
      "9/10",
      "9/24",
      "10/8",
    ]);
  });

  it("skips months that have no such day rather than clamping", () => {
    const occurrences = expandOccurrences(
      chicago(2026, 1, 31, 9),
      rule({ frequency: "MONTHLY" }),
      { from: chicago(2026, 1, 1), to: chicago(2026, 6, 1) },
      ZONE,
    );
    expect(occurrences.map((date) => date.getMonth() + 1)).toEqual([1, 3, 5]);
  });

  it("repeats yearly, including a leap day only in leap years", () => {
    const occurrences = expandOccurrences(
      chicago(2024, 2, 29, 9),
      rule({ frequency: "YEARLY" }),
      { from: chicago(2024, 1, 1), to: chicago(2033, 1, 1) },
      ZONE,
    );
    expect(occurrences.map((date) => date.getFullYear())).toEqual([2024, 2028, 2032]);
  });

  it("stops at the until date, inclusive", () => {
    const occurrences = expandOccurrences(
      chicago(2026, 9, 10, 7),
      rule({ frequency: "DAILY", until: chicago(2026, 9, 12, 23, 59) }),
      { from: chicago(2026, 9, 1), to: chicago(2026, 9, 30) },
      ZONE,
    );
    expect(occurrences.map((date) => date.getDate())).toEqual([10, 11, 12]);
  });

  it("treats the window end as exclusive", () => {
    const occurrences = expandOccurrences(
      chicago(2026, 9, 10, 7),
      rule({ frequency: "DAILY" }),
      { from: chicago(2026, 9, 10), to: chicago(2026, 9, 11, 7) },
      ZONE,
    );
    expect(occurrences.map((date) => date.getDate())).toEqual([10]);
  });

  it("caps a runaway rule", () => {
    const occurrences = expandOccurrences(
      chicago(2000, 1, 1, 7),
      rule({ frequency: "DAILY" }),
      { from: chicago(2000, 1, 1), to: chicago(2030, 1, 1) },
      ZONE,
    );
    expect(occurrences).toHaveLength(1000);
  });
});

describe("effectiveWeekdays", () => {
  it("sorts, de-duplicates and drops nonsense", () => {
    expect(effectiveWeekdays([5, 1, 5, 9, -1, 3.5], 4)).toEqual([1, 5]);
  });

  it("falls back to the anchor's weekday", () => {
    expect(effectiveWeekdays([], 4)).toEqual([4]);
  });
});

describe("currentOccurrence", () => {
  const daily = rule({ frequency: "DAILY" });

  it("is today's occurrence when there is one, even if it has passed", () => {
    const anchor = chicago(2026, 9, 1, 7);
    const now = chicago(2026, 9, 10, 20);
    expect(currentOccurrence(anchor, daily, now, ZONE).toISOString()).toBe(chicago(2026, 9, 10, 7).toISOString());
  });

  it("is the next one when nothing falls today", () => {
    const anchor = chicago(2026, 9, 1, 7);
    const now = chicago(2026, 9, 10, 20);
    const weekly = rule({ frequency: "WEEKLY", weekdays: [1] }); // Mondays
    expect(currentOccurrence(anchor, weekly, now, ZONE).toISOString()).toBe(chicago(2026, 9, 14, 7).toISOString());
  });

  it("is the last one for a series that has ended", () => {
    const anchor = chicago(2026, 9, 1, 7);
    const ended = rule({ frequency: "DAILY", until: chicago(2026, 9, 5) });
    expect(currentOccurrence(anchor, ended, chicago(2026, 9, 20), ZONE).toISOString()).toBe(chicago(2026, 9, 5, 7).toISOString());
  });

  it("is the anchor itself for a one-off", () => {
    const anchor = chicago(2026, 9, 1, 7);
    expect(currentOccurrence(anchor, null, chicago(2026, 9, 20), ZONE)).toBe(anchor);
  });
});

describe("describeRepeat", () => {
  const anchor = chicago(2026, 9, 10, 7); // a Thursday

  it("reads naturally for each frequency", () => {
    expect(describeRepeat(null, anchor, ZONE)).toBe("Does not repeat");
    expect(describeRepeat(rule({ frequency: "DAILY" }), anchor, ZONE)).toBe("Every day");
    expect(describeRepeat(rule({ frequency: "DAILY", interval: 2 }), anchor, ZONE)).toBe("Every 2 days");
    expect(describeRepeat(rule({ frequency: "WEEKLY", weekdays: [1, 3] }), anchor, ZONE)).toBe("Weekly on Mon, Wed");
    expect(describeRepeat(rule({ frequency: "WEEKLY" }), anchor, ZONE)).toBe("Weekly on Thu");
    expect(describeRepeat(rule({ frequency: "MONTHLY", interval: 3 }), anchor, ZONE)).toBe("Every 3 months on the 10th");
    expect(describeRepeat(rule({ frequency: "YEARLY" }), anchor, ZONE)).toBe("Yearly on Sep 10");
  });

  it("appends the end date", () => {
    expect(
      describeRepeat(rule({ frequency: "DAILY", until: chicago(2026, 12, 31) }), anchor, ZONE),
    ).toBe("Every day until Dec 31, 2026");
  });
});
