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
