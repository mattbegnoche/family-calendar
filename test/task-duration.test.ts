import { describe, expect, it } from "vitest";

import {
  DEFAULT_TASK_DURATION_MINUTES,
  TASK_DURATION_PRESETS,
  durationBetween,
  durationChoices,
  formatDuration,
  isTaskDuration,
} from "@/lib/task-duration";

describe("isTaskDuration", () => {
  it("accepts whole minutes within a day", () => {
    expect(isTaskDuration(DEFAULT_TASK_DURATION_MINUTES)).toBe(true);
    expect(isTaskDuration(5)).toBe(true);
    expect(isTaskDuration(1440)).toBe(true);
  });

  it("rejects fractions, zero, and more than a day", () => {
    expect(isTaskDuration(0)).toBe(false);
    expect(isTaskDuration(7.5)).toBe(false);
    expect(isTaskDuration(1441)).toBe(false);
    expect(isTaskDuration("30")).toBe(false);
  });
});

describe("durationBetween", () => {
  it("measures a dragged range in minutes and clamps it", () => {
    const start = new Date(2026, 8, 10, 9);
    expect(durationBetween(start, new Date(2026, 8, 10, 10, 15))).toBe(75);
    expect(durationBetween(start, start)).toBe(5);
    expect(durationBetween(start, new Date(2026, 8, 12, 9))).toBe(1440);
  });
});

describe("formatDuration", () => {
  it("reads as people say it", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(1440)).toBe("24 hr");
  });
});

describe("durationChoices", () => {
  it("always includes the current value, once, in order", () => {
    expect(durationChoices(30)).toEqual(TASK_DURATION_PRESETS);
    expect(durationChoices(75)).toEqual([15, 30, 45, 60, 75, 90, 120, 180, 240]);
  });
});
