import { describe, expect, it } from "vitest";

import {
  currentTaskOccurrence,
  normalizeRepeatRule,
  repeatRuleOf,
  taskOccurrencesInWindow,
  type OccurrenceSource,
} from "@/lib/task-occurrences";
import { zonedDateTime } from "@/lib/time-zones";

const ZONE = "America/Chicago";
const chicago = (month: number, day: number, hour = 7) =>
  zonedDateTime({ year: 2026, month, day, hour, minute: 0 }, ZONE);

function task(overrides: Partial<OccurrenceSource> & { id: string }): OccurrenceSource {
  return {
    dueAt: chicago(9, 10),
    completedAt: null,
    completedByMember: null,
    repeatFrequency: null,
    repeatInterval: 1,
    repeatWeekdays: [],
    repeatUntil: null,
    ...overrides,
  };
}

const window = { from: chicago(9, 9, 0), to: chicago(9, 13, 0) };

describe("taskOccurrencesInWindow", () => {
  it("includes a one-off inside the window with its own completion", () => {
    const done = task({ id: "a", completedAt: chicago(9, 10, 8), completedByMember: { name: "Mom" } });
    const [occurrence] = taskOccurrencesInWindow([done], [], window, ZONE);
    expect(occurrence).toMatchObject({ isRepeating: false, isDone: true, completedByName: "Mom" });
    expect(occurrence.start).toBe(done.dueAt);
  });

  it("leaves out undated tasks and one-offs outside the window", () => {
    const tasks = [task({ id: "undated", dueAt: null }), task({ id: "later", dueAt: chicago(9, 20) })];
    expect(taskOccurrencesInWindow(tasks, [], window, ZONE)).toEqual([]);
  });

  it("expands a repeating task and marks only the checked-off mornings done", () => {
    const daily = task({ id: "teeth", dueAt: chicago(9, 1), repeatFrequency: "DAILY" });
    const completions = [
      { taskId: "teeth", occurrenceStart: chicago(9, 10), completedByMember: { name: "Ava" } },
      { taskId: "other", occurrenceStart: chicago(9, 11), completedByMember: null },
    ];

    const occurrences = taskOccurrencesInWindow([daily], completions, window, ZONE);

    expect(occurrences.map((occurrence) => occurrence.start.getDate())).toEqual([9, 10, 11, 12]);
    expect(occurrences.map((occurrence) => occurrence.isDone)).toEqual([false, true, false, false]);
    expect(occurrences[1].completedByName).toBe("Ava");
    expect(occurrences.every((occurrence) => occurrence.isRepeating)).toBe(true);
  });

  it("orders by start across tasks", () => {
    const early = task({ id: "z", dueAt: chicago(9, 10, 6) });
    const late = task({ id: "a", dueAt: chicago(9, 10, 9) });
    expect(taskOccurrencesInWindow([late, early], [], window, ZONE).map((o) => o.task.id)).toEqual(["z", "a"]);
  });
});

describe("currentTaskOccurrence", () => {
  it("is null for an undated task and the task itself for a one-off", () => {
    expect(currentTaskOccurrence(task({ id: "u", dueAt: null }), [], chicago(9, 10), ZONE)).toBeNull();
    const single = task({ id: "s" });
    expect(currentTaskOccurrence(single, [], chicago(9, 20), ZONE)?.start).toBe(single.dueAt);
  });

  it("reports today's occurrence of a repeating task with its completion", () => {
    const daily = task({ id: "d", dueAt: chicago(9, 1), repeatFrequency: "DAILY" });
    const completions = [{ taskId: "d", occurrenceStart: chicago(9, 10), completedByMember: null }];
    const occurrence = currentTaskOccurrence(daily, completions, chicago(9, 10, 20), ZONE);
    expect(occurrence?.start.toISOString()).toBe(chicago(9, 10).toISOString());
    expect(occurrence?.isDone).toBe(true);
  });
});

describe("rules", () => {
  it("round-trips through repeatRuleOf", () => {
    const weekly = task({ id: "w", repeatFrequency: "WEEKLY", repeatInterval: 2, repeatWeekdays: [1, 3] });
    expect(repeatRuleOf(weekly)).toEqual({ frequency: "WEEKLY", interval: 2, weekdays: [1, 3], until: null });
    expect(repeatRuleOf(task({ id: "once" }))).toBeNull();
  });

  it("normalises weekdays only for weekly rules and never below every 1", () => {
    const anchor = chicago(9, 10); // Thursday
    expect(normalizeRepeatRule({ frequency: "WEEKLY", interval: 0, weekdays: [], until: null }, anchor)).toEqual({
      repeatFrequency: "WEEKLY",
      repeatInterval: 1,
      repeatWeekdays: [4],
      repeatUntil: null,
    });
    expect(normalizeRepeatRule({ frequency: "DAILY", interval: 2.7, weekdays: [1], until: null }, anchor)).toMatchObject({
      repeatInterval: 2,
      repeatWeekdays: [],
    });
  });
});
