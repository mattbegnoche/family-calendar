import type { DateRange } from "@/lib/calendar/types";
import {
  currentOccurrence,
  effectiveWeekdays,
  expandOccurrences,
  type RepeatFrequency,
  type RepeatRule,
} from "@/lib/task-recurrence";

/**
 * From stored tasks to the occurrences a calendar window or the tasks page
 * shows. Pure: the shapes below are the subset of a Task row and a
 * TaskCompletion row this needs, so the same function serves the server and
 * the tests.
 */

export interface RepeatFields {
  readonly repeatFrequency: RepeatFrequency | null;
  readonly repeatInterval: number;
  readonly repeatWeekdays: readonly number[];
  readonly repeatUntil: Date | null;
}

export interface OccurrenceSource extends RepeatFields {
  readonly id: string;
  readonly dueAt: Date | null;
  readonly completedAt: Date | null;
  readonly completedByMember: { readonly name: string } | null;
}

export interface CompletionSource {
  readonly taskId: string;
  readonly occurrenceStart: Date;
  readonly completedByMember: { readonly name: string } | null;
}

export interface TaskOccurrence<T extends OccurrenceSource> {
  readonly task: T;
  readonly start: Date;
  readonly isRepeating: boolean;
  readonly isDone: boolean;
  readonly completedByName: string | null;
}

export function repeatRuleOf(task: RepeatFields): RepeatRule | null {
  if (!task.repeatFrequency) return null;
  return {
    frequency: task.repeatFrequency,
    interval: task.repeatInterval,
    weekdays: task.repeatWeekdays,
    until: task.repeatUntil,
  };
}

export function isRepeating(task: RepeatFields): boolean {
  return task.repeatFrequency !== null;
}

function completionKey(taskId: string, start: Date): string {
  return `${taskId}|${start.getTime()}`;
}

function completionIndex(completions: readonly CompletionSource[]): ReadonlyMap<string, CompletionSource> {
  return new Map(
    completions.map((completion) => [
      completionKey(completion.taskId, completion.occurrenceStart),
      completion,
    ]),
  );
}

function occurrenceFor<T extends OccurrenceSource>(
  task: T,
  start: Date,
  completions: ReadonlyMap<string, CompletionSource>,
): TaskOccurrence<T> {
  if (!isRepeating(task)) {
    return {
      task,
      start,
      isRepeating: false,
      isDone: task.completedAt !== null,
      completedByName: task.completedByMember?.name ?? null,
    };
  }
  const completion = completions.get(completionKey(task.id, start));
  return {
    task,
    start,
    isRepeating: true,
    isDone: completion !== undefined,
    completedByName: completion?.completedByMember?.name ?? null,
  };
}

/**
 * Every occurrence of every dated task that starts inside the window: a
 * one-off contributes at most itself, a repeating task its expansion.
 * Ascending by start, then by task id for a stable order.
 */
export function taskOccurrencesInWindow<T extends OccurrenceSource>(
  tasks: readonly T[],
  completions: readonly CompletionSource[],
  window: DateRange,
  timeZone: string,
): TaskOccurrence<T>[] {
  const index = completionIndex(completions);
  return tasks
    .flatMap((task) => {
      if (!task.dueAt) return [];
      return expandOccurrences(task.dueAt, repeatRuleOf(task), window, timeZone).map((start) =>
        occurrenceFor(task, start, index),
      );
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.task.id.localeCompare(b.task.id));
}

/**
 * The occurrence the tasks page shows for a task: the one it is "about" right
 * now (see currentOccurrence). Null for an undated task.
 */
export function currentTaskOccurrence<T extends OccurrenceSource>(
  task: T,
  completions: readonly CompletionSource[],
  now: Date,
  timeZone: string,
): TaskOccurrence<T> | null {
  if (!task.dueAt) return null;
  const start = currentOccurrence(task.dueAt, repeatRuleOf(task), now, timeZone);
  return occurrenceFor(task, start, completionIndex(completions));
}

/** Normalises a rule for storage: clamps the interval, tidies weekdays, drops what does not apply. */
export function normalizeRepeatRule(rule: RepeatRule, anchor: Date): RepeatFields {
  const anchorWeekday = anchor.getDay();
  return {
    repeatFrequency: rule.frequency,
    repeatInterval: Math.max(1, Math.floor(rule.interval)),
    repeatWeekdays:
      rule.frequency === "WEEKLY" ? effectiveWeekdays(rule.weekdays, anchorWeekday) : [],
    repeatUntil: rule.until,
  };
}

export const NO_REPEAT: RepeatFields = {
  repeatFrequency: null,
  repeatInterval: 1,
  repeatWeekdays: [],
  repeatUntil: null,
};
