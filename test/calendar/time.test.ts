import { describe, expect, it } from "vitest";

import {
  MINUTES_PER_DAY,
  MIN_EVENT_MINUTES,
  atMinutes,
  clampMinutes,
  minutesSinceMidnight,
  sliceOnDay,
  snapMinutes,
} from "@/lib/calendar/time";
import { TEST_DAY, at } from "../helpers/calendar-events";

describe("minutesSinceMidnight", () => {
  it("reads the wall clock rather than elapsed time", () => {
    expect(minutesSinceMidnight(at(10, 15, 30))).toBe(930);
  });
});

describe("snapMinutes", () => {
  it("rounds to the nearest quarter hour", () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(52)).toBe(45);
    expect(snapMinutes(53)).toBe(60);
  });

  it("honours a custom step", () => {
    expect(snapMinutes(50, 30)).toBe(60);
  });
});

describe("clampMinutes", () => {
  it("keeps values inside one day", () => {
    expect(clampMinutes(-30)).toBe(0);
    expect(clampMinutes(1500)).toBe(MINUTES_PER_DAY);
    expect(clampMinutes(600)).toBe(600);
  });
});

describe("atMinutes", () => {
  it("builds a local instant on the day", () => {
    expect(atMinutes(TEST_DAY, 930).getTime()).toBe(at(10, 15, 30).getTime());
  });

  it("rolls 1440 into the next midnight", () => {
    expect(atMinutes(TEST_DAY, MINUTES_PER_DAY).getTime()).toBe(at(11, 0).getTime());
  });

  it("clamps a negative offset to midnight", () => {
    expect(atMinutes(TEST_DAY, -15).getTime()).toBe(at(10, 0).getTime());
  });
});

describe("sliceOnDay", () => {
  it("returns the wall-clock span of an event inside the day", () => {
    expect(sliceOnDay(at(10, 9), at(10, 10, 30), TEST_DAY)).toEqual({
      startMinutes: 540,
      endMinutes: 630,
    });
  });

  it("clips an event that started the day before", () => {
    expect(sliceOnDay(at(9, 22), at(10, 2), TEST_DAY)).toEqual({
      startMinutes: 0,
      endMinutes: 120,
    });
  });

  it("clips an event that runs past midnight", () => {
    expect(sliceOnDay(at(10, 22), at(11, 2), TEST_DAY)).toEqual({
      startMinutes: 1320,
      endMinutes: MINUTES_PER_DAY,
    });
  });

  it("returns null for an event on another day", () => {
    expect(sliceOnDay(at(12, 9), at(12, 10), TEST_DAY)).toBeNull();
  });

  it("keeps an event ending exactly at midnight on the day before", () => {
    expect(sliceOnDay(at(9, 21), at(10, 0), TEST_DAY)).toBeNull();
    expect(sliceOnDay(at(9, 21), at(10, 0), new Date(2026, 8, 9))).toEqual({
      startMinutes: 1260,
      endMinutes: MINUTES_PER_DAY,
    });
  });

  it("gives an instant a minimum block so it stays clickable", () => {
    expect(sliceOnDay(at(10, 9), at(10, 9), TEST_DAY)).toEqual({
      startMinutes: 540,
      endMinutes: 540 + MIN_EVENT_MINUTES,
    });
  });
});
