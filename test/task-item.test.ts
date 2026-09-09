import { describe, expect, test } from "vitest";

import { compareTasks, TASK_VIEW_MODES, TASK_VIEW_MODE_LABEL, type TaskItem } from "@/lib/task-item";
import type { TaskPriority } from "@/lib/task-priority";

function task(overrides: Partial<TaskItem> & { id: string }): TaskItem {
  return {
    title: overrides.id,
    icon: null,
    notes: null,
    priority: "MEDIUM" as TaskPriority,
    status: "BACKLOG",
    dueLabel: null,
    dueAtMs: null,
    memberId: "m1",
    memberName: "Ava",
    memberColor: "#4f46e5",
    completedByName: null,
    ...overrides,
  };
}

/** Sorting a copy, the way both views do. */
function order(tasks: TaskItem[]): string[] {
  return [...tasks].sort(compareTasks).map((item) => item.id);
}

describe("compareTasks", () => {
  test("puts more urgent tasks first", () => {
    const tasks = [
      task({ id: "low", priority: "LOW" }),
      task({ id: "urgent", priority: "URGENT" }),
      task({ id: "medium", priority: "MEDIUM" }),
      task({ id: "high", priority: "HIGH" }),
    ];

    expect(order(tasks)).toEqual(["urgent", "high", "medium", "low"]);
  });

  test("breaks equal priority by earliest date", () => {
    const tasks = [
      task({ id: "later", dueAtMs: 2_000 }),
      task({ id: "sooner", dueAtMs: 1_000 }),
    ];

    expect(order(tasks)).toEqual(["sooner", "later"]);
  });

  test("priority outranks the date", () => {
    // An urgent task next week still comes before a low one this afternoon.
    const tasks = [
      task({ id: "low-soon", priority: "LOW", dueAtMs: 1_000 }),
      task({ id: "urgent-later", priority: "URGENT", dueAtMs: 9_000 }),
    ];

    expect(order(tasks)).toEqual(["urgent-later", "low-soon"]);
  });

  test("a dated task outranks an undated one at the same priority", () => {
    const tasks = [
      task({ id: "undated", dueAtMs: null }),
      task({ id: "dated", dueAtMs: 5_000 }),
    ];

    expect(order(tasks)).toEqual(["dated", "undated"]);
  });

  test("falls back to title so the order is stable", () => {
    // Both views re-sort on every optimistic update; an unstable comparator
    // would make cards jump around as unrelated tasks change.
    const tasks = [task({ id: "b", title: "Bathe dog" }), task({ id: "a", title: "Absolute" })];

    expect(order(tasks)).toEqual(["a", "b"]);
    expect(order(tasks)).toEqual(order(tasks));
  });

  test("is symmetric for equal items", () => {
    const first = task({ id: "x", title: "Same" });
    const second = task({ id: "y", title: "Same" });

    expect(compareTasks(first, second)).toBe(0);
    expect(compareTasks(second, first)).toBe(0);
  });
});

describe("view modes", () => {
  test("every mode has a label", () => {
    expect(TASK_VIEW_MODES).toEqual(["board", "list"]);
    for (const mode of TASK_VIEW_MODES) {
      expect(TASK_VIEW_MODE_LABEL[mode]).toBeTruthy();
    }
  });
});
