import { describe, expect, test } from "vitest";

import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  isTaskStatus,
  taskStatusOf,
} from "@/lib/task-status";

const DATE = new Date("2026-09-09T09:00:00Z");

describe("taskStatusOf", () => {
  test("a task with neither a date nor a completion is backlog", () => {
    expect(taskStatusOf({ completedAt: null, dueAt: null })).toBe("BACKLOG");
  });

  test("a task with a date is scheduled", () => {
    // "Scheduled" is defined as having a date, which is exactly what puts it on
    // the calendar — the two must never disagree.
    expect(taskStatusOf({ completedAt: null, dueAt: DATE })).toBe("SCHEDULED");
  });

  test("completion wins over a date", () => {
    // A finished task belongs in Completed even though it still has its date,
    // otherwise checking something off would leave it in Scheduled.
    expect(taskStatusOf({ completedAt: DATE, dueAt: DATE })).toBe("COMPLETED");
  });

  test("a completed task with no date is still completed", () => {
    expect(taskStatusOf({ completedAt: DATE, dueAt: null })).toBe("COMPLETED");
  });

  test("accepts serialized dates, as they arrive from the server boundary", () => {
    expect(taskStatusOf({ completedAt: null, dueAt: DATE.toISOString() })).toBe(
      "SCHEDULED",
    );
    expect(taskStatusOf({ completedAt: DATE.toISOString(), dueAt: null })).toBe(
      "COMPLETED",
    );
  });
});

describe("isTaskStatus", () => {
  test("accepts every status it advertises", () => {
    for (const status of TASK_STATUSES) {
      expect(isTaskStatus(status)).toBe(true);
      expect(TASK_STATUS_LABEL[status]).toBeTruthy();
    }
  });

  test("rejects anything else, including near-misses and non-strings", () => {
    // moveTask trusts this to reject a hand-crafted POST.
    expect(isTaskStatus("backlog")).toBe(false);
    expect(isTaskStatus("DONE")).toBe(false);
    expect(isTaskStatus("")).toBe(false);
    expect(isTaskStatus(null)).toBe(false);
    expect(isTaskStatus(undefined)).toBe(false);
    expect(isTaskStatus(1)).toBe(false);
  });
});
