import "server-only";

import { prisma } from "@/lib/prisma";
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

/** Only tasks with a time land on the calendar; the rest live in the list. */
export async function listScheduledTasks(
  householdId: string,
  window: { from: Date; to: Date },
) {
  return prisma.task.findMany({
    where: { householdId, dueAt: { gte: window.from, lt: window.to } },
    orderBy: { dueAt: "asc" },
    select: TASK_SELECT,
  });
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
    },
    select: TASK_SELECT,
  });
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

  // BACKLOG is the absence of both: no date, not done.
  return { dueAt: null, completedAt: null, completedByMemberId: null };
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
