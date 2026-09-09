import { describe, expect, it } from "vitest";

import { zonedMidnight } from "@/lib/time-zones";

describe("zonedMidnight", () => {
  it("anchors a summer date at local midnight in Chicago (UTC-5)", () => {
    expect(zonedMidnight("2026-07-04", "America/Chicago").toISOString()).toBe(
      "2026-07-04T05:00:00.000Z",
    );
  });

  it("anchors a winter date at local midnight in Chicago (UTC-6)", () => {
    expect(zonedMidnight("2026-01-15", "America/Chicago").toISOString()).toBe(
      "2026-01-15T06:00:00.000Z",
    );
  });

  it("handles zones ahead of UTC", () => {
    expect(zonedMidnight("2026-07-04", "Asia/Tokyo").toISOString()).toBe(
      "2026-07-03T15:00:00.000Z",
    );
  });

  it("is the plain UTC instant in UTC", () => {
    expect(zonedMidnight("2026-07-04", "UTC").toISOString()).toBe("2026-07-04T00:00:00.000Z");
  });

  it("is still standard time at midnight on the day the clocks spring forward", () => {
    expect(zonedMidnight("2026-03-08", "America/Chicago").toISOString()).toBe(
      "2026-03-08T06:00:00.000Z",
    );
  });

  it("is still daylight time at midnight on the day the clocks fall back", () => {
    expect(zonedMidnight("2026-11-01", "America/Chicago").toISOString()).toBe(
      "2026-11-01T05:00:00.000Z",
    );
  });

  it("rejects anything that is not a calendar date", () => {
    expect(() => zonedMidnight("2026-7-4", "UTC")).toThrow(RangeError);
    expect(() => zonedMidnight("2026-07-04T00:00", "UTC")).toThrow(RangeError);
  });
});

describe("wallClockIn and zonedDateTime", () => {
  it("round-trip a wall-clock time through its instant", async () => {
    const { wallClockIn, zonedDateTime } = await import("@/lib/time-zones");
    const clock = { year: 2026, month: 9, day: 10, hour: 7, minute: 30 };
    const instant = zonedDateTime(clock, "America/Chicago");
    expect(instant.toISOString()).toBe("2026-09-10T12:30:00.000Z");
    expect(wallClockIn(instant, "America/Chicago")).toEqual(clock);
  });

  it("resolves a time that the spring-forward gap swallows to just after the gap", async () => {
    const { zonedDateTime } = await import("@/lib/time-zones");
    // 2:30 am on 8 March 2026 never happens in Chicago; the first valid instant after it is 3:30 am CDT.
    expect(
      zonedDateTime({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, "America/Chicago").toISOString(),
    ).toBe("2026-03-08T08:30:00.000Z");
  });
});
