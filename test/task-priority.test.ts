import { describe, expect, test } from "vitest";

import {
  DEFAULT_TASK_PRIORITY,
  TASK_PRIORITIES,
  TASK_PRIORITY_BADGE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_RAIL,
  TASK_PRIORITY_RANK,
  isTaskPriority,
  toTaskPriority,
} from "@/lib/task-priority";

describe("the priority list", () => {
  test("runs most urgent first, which is also the sort order", () => {
    expect(TASK_PRIORITIES).toEqual(["URGENT", "HIGH", "MEDIUM", "LOW"]);
  });

  test("ranks agree with the declared order", () => {
    // Derived from the array, so this guards against the two drifting apart if
    // TASK_PRIORITIES is ever reordered.
    expect(TASK_PRIORITY_RANK.URGENT).toBeLessThan(TASK_PRIORITY_RANK.HIGH);
    expect(TASK_PRIORITY_RANK.HIGH).toBeLessThan(TASK_PRIORITY_RANK.MEDIUM);
    expect(TASK_PRIORITY_RANK.MEDIUM).toBeLessThan(TASK_PRIORITY_RANK.LOW);
  });

  test("every priority has a label and both style maps", () => {
    for (const priority of TASK_PRIORITIES) {
      expect(TASK_PRIORITY_LABEL[priority]).toBeTruthy();
      expect(TASK_PRIORITY_BADGE[priority]).toBeTruthy();
      expect(TASK_PRIORITY_RAIL[priority]).toBeTruthy();
    }
  });

  test("the default is one of them and matches the column default", () => {
    expect(isTaskPriority(DEFAULT_TASK_PRIORITY)).toBe(true);
    // The migration declares DEFAULT 'MEDIUM'; disagreeing here would make an
    // untriaged task render as something the database never stored.
    expect(DEFAULT_TASK_PRIORITY).toBe("MEDIUM");
  });
});

describe("isTaskPriority", () => {
  test("rejects near-misses and non-strings", () => {
    expect(isTaskPriority("urgent")).toBe(false);
    expect(isTaskPriority("CRITICAL")).toBe(false);
    expect(isTaskPriority(null)).toBe(false);
    expect(isTaskPriority(2)).toBe(false);
  });
});

describe("toTaskPriority", () => {
  test("passes valid values through", () => {
    expect(toTaskPriority("URGENT")).toBe("URGENT");
  });

  test("falls back to the default instead of throwing", () => {
    // An unset select, or a form POST with no priority, means "normal".
    expect(toTaskPriority(undefined)).toBe(DEFAULT_TASK_PRIORITY);
    expect(toTaskPriority("nonsense")).toBe(DEFAULT_TASK_PRIORITY);
    expect(toTaskPriority(null)).toBe(DEFAULT_TASK_PRIORITY);
  });
});
