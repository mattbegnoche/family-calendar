import "server-only";

import type { DateRange } from "@/lib/calendar/types";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TASK_DURATION_MINUTES } from "@/lib/task-duration";
import { NO_REPEAT, type RepeatFields } from "@/lib/task-occurrences";
import type { TaskPriority } from "@/lib/task-priority";
import type { TaskStatus } from "@/lib/task-status";

/** The three columns the tasks page renders, in display order. */
export const TIMES_OF_DAY = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

const NOON = 12;
const EVENING_STARTS = 18;

/** Which column Skylight would surface right now, by wall-clock hour. */
export function currentTimeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours();
  if (hour < NOON) return "MORNING";
  if (hour < EVENING_STARTS) return "AFTERNOON";
  return "EVENING";
}

export interface TaskInput {
  title: string;
  memberId: string;
  timeOfDay: TimeOfDay;
  priority: TaskPriority;
  icon?: string | null;
  notes?: string | null;
  dueAt?: Date | null;
  dueAllDay?: boolean;
  /** Length of the calendar block for a timed task; the default when absent. */
  durationMinutes?: number;
  /** Absent means the task happens once. Only meaningful with a dueAt. */
  repeat?: RepeatFields;
}

const TASK_SELECT = {
  id: true,
  title: true,
  notes: true,
  icon: true,
  timeOfDay: true,
  priority: true,
  dueAt: true,
  dueAllDay: true,
  durationMinutes: true,
  repeatFrequency: true,
  repeatInterval: true,
  repeatWeekdays: true,
  repeatUntil: true,
  completedAt: true,
  sortOrder: true,
  memberId: true,
  member: { select: { slug: true, name: true, color: true } },
  completedByMember: { select: { name: true } },
} as const;

export type TaskRecord = Awaited<ReturnType<typeof listTasks>>[number];

export async function listTasks(householdId: string) {
  return prisma.task.findMany({
    where: { householdId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: TASK_SELECT,
  });
}

/**
 * Tasks that can put an occurrence inside the window: one-offs due in it, and
 * every repeating task that started before it ends and has not finished
 * before it starts. Expansion into actual occurrences is the caller's job,
 * via src/lib/task-occurrences.ts, because it needs the household's zone.
 */
export async function listTasksForWindow(householdId: string, window: DateRange) {
  return prisma.task.findMany({
    where: {
      householdId,
      OR: [
        { repeatFrequency: null, dueAt: { gte: window.from, lt: window.to } },
        {
          repeatFrequency: { not: null },
          dueAt: { lt: window.to },
          OR: [{ repeatUntil: null }, { repeatUntil: { gte: window.from } }],
        },
      ],
    },
    orderBy: { dueAt: "asc" },
    select: TASK_SELECT,
  });
}

const COMPLETION_SELECT = {
  taskId: true,
  occurrenceStart: true,
  completedByMember: { select: { name: true } },
} as const;

/** Checked-off occurrences of the household's repeating tasks that start in the window. */
export async function listCompletions(householdId: string, window: DateRange) {
  return prisma.taskCompletion.findMany({
    where: {
      task: { householdId },
      occurrenceStart: { gte: window.from, lt: window.to },
    },
    select: COMPLETION_SELECT,
  });
}

function repeatColumns(input: TaskInput) {
  // A rule without a date has nothing to repeat from; store none.
  const repeat = input.dueAt ? (input.repeat ?? NO_REPEAT) : NO_REPEAT;
  return {
    repeatFrequency: repeat.repeatFrequency,
    repeatInterval: repeat.repeatInterval,
    repeatWeekdays: [...repeat.repeatWeekdays],
    repeatUntil: repeat.repeatUntil,
  };
}

export async function createTask(
  householdId: string,
  createdById: string | null,
  input: TaskInput,
) {
  return prisma.task.create({
    data: {
      householdId,
      createdById,
      title: input.title,
      memberId: input.memberId,
      timeOfDay: input.timeOfDay,
      priority: input.priority,
      icon: input.icon ?? null,
      notes: input.notes ?? null,
      dueAt: input.dueAt ?? null,
      dueAllDay: input.dueAllDay ?? true,
      durationMinutes: input.durationMinutes ?? DEFAULT_TASK_DURATION_MINUTES,
      ...repeatColumns(input),
    },
    select: TASK_SELECT,
  });
}

/** Scoped by householdId, so a task id from another household resolves to nothing. */
export async function updateTask(householdId: string, taskId: string, input: TaskInput) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, householdId },
    data: {
      title: input.title,
      memberId: input.memberId,
      timeOfDay: input.timeOfDay,
      priority: input.priority,
      icon: input.icon ?? null,
      notes: input.notes ?? null,
      dueAt: input.dueAt ?? null,
      dueAllDay: input.dueAllDay ?? true,
      durationMinutes: input.durationMinutes ?? DEFAULT_TASK_DURATION_MINUTES,
      ...repeatColumns(input),
    },
  });
  if (result.count === 0) throw new Error(`No task ${taskId} in this household`);
}

/** The fields that decide whether a task repeats and from when. */
export async function findTaskSchedule(householdId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, householdId },
    select: {
      id: true,
      dueAt: true,
      completedAt: true,
      completedByMember: { select: { name: true } },
      repeatFrequency: true,
      repeatInterval: true,
      repeatWeekdays: true,
      repeatUntil: true,
    },
  });
}

/**
 * Check off, or un-check, ONE occurrence of a repeating task. A completion
 * row exists exactly for the occurrences that are done, so completing is an
 * upsert and reopening is a delete.
 */
export async function setOccurrenceCompletion(
  householdId: string,
  taskId: string,
  occurrenceStart: Date,
  isComplete: boolean,
  completedByMemberId: string | null,
): Promise<void> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, householdId },
    select: { id: true },
  });
  if (!task) throw new Error(`No task ${taskId} in this household`);

  if (isComplete) {
    await prisma.taskCompletion.upsert({
      where: { taskId_occurrenceStart: { taskId, occurrenceStart } },
      create: { taskId, occurrenceStart, completedByMemberId },
      update: { completedAt: new Date(), completedByMemberId },
    });
  } else {
    await prisma.taskCompletion.deleteMany({ where: { taskId, occurrenceStart } });
  }
}

/**
 * Check off or un-check. The completer is a MEMBER, not a user, so a shared
 * display can check something off without anyone signing in.
 */
export async function setTaskCompletion(
  householdId: string,
  taskId: string,
  isComplete: boolean,
  completedByMemberId: string | null,
) {
  const result = await prisma.task.updateMany({
    where: { id: taskId, householdId },
    data: isComplete
      ? { completedAt: new Date(), completedByMemberId }
      : { completedAt: null, completedByMemberId: null },
  });
  if (result.count === 0) throw new Error(`No task ${taskId} in this household`);
}

export async function deleteTask(householdId: string, taskId: string) {
  const result = await prisma.task.deleteMany({ where: { id: taskId, householdId } });
  if (result.count === 0) throw new Error(`No task ${taskId} in this household`);
}

/**
 * What moving a task into a column actually changes.
 *
 * Split out of moveTaskToStatus so the mapping reads as three flat cases rather
 * than a nested ternary — this is the whole meaning of the Kanban board, and it
 * is the part worth being able to read at a glance.
 */
function statusUpdate(
  status: TaskStatus,
  existingDueAt: Date | null,
  options: MoveTaskOptions,
) {
  if (status === "COMPLETED") {
    return {
      completedAt: new Date(),
      completedByMemberId: options.completedByMemberId,
    };
  }

  if (status === "SCHEDULED") {
    return {
      // Keeps whatever date it already had. Re-opening a finished task must not
      // silently move it somewhere else on the calendar.
      dueAt: existingDueAt ?? options.fallbackDueAt,
      completedAt: null,
      completedByMemberId: null,
    };
  }

  // BACKLOG is the absence of both: no date, not done. A repeat rule has
  // nothing to repeat from without a date, so it goes too.
  return { dueAt: null, completedAt: null, completedByMemberId: null, repeatFrequency: null };
}

export interface MoveTaskOptions {
  /** The member checking it off, when the target column is COMPLETED. */
  readonly completedByMemberId: string | null;
  /**
   * Used only when scheduling a task that has no date yet. Computed on the
   * client, because the browser is the only place that knows the user's own
   * wall clock — the same convention the calendar's event actions follow.
   */
  readonly fallbackDueAt: Date;
}

export async function moveTaskToStatus(
  householdId: string,
  taskId: string,
  status: TaskStatus,
  options: MoveTaskOptions,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Scoped by householdId, so a task id from another household resolves to
    // nothing rather than being moved.
    const task = await tx.task.findFirst({
      where: { id: taskId, householdId },
      select: { dueAt: true },
    });
    if (!task) throw new Error(`No task ${taskId} in this household`);

    await tx.task.update({
      where: { id: taskId },
      data: statusUpdate(status, task.dueAt, options),
    });
  });
}

export async function setTaskPriority(
  householdId: string,
  taskId: string,
  priority: TaskPriority,
): Promise<void> {
  const result = await prisma.task.updateMany({
    where: { id: taskId, householdId },
    data: { priority },
  });
  if (result.count === 0) throw new Error(`No task ${taskId} in this household`);
}

/** Clearing the date sends a task back to the backlog, by definition. */
export async function setTaskDueAt(
  householdId: string,
  taskId: string,
  dueAt: Date | null,
): Promise<void> {
  const result = await prisma.task.updateMany({
    where: { id: taskId, householdId },
    data: { dueAt },
  });
  if (result.count === 0) throw new Error(`No task ${taskId} in this household`);
}
