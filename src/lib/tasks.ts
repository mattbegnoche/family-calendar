import "server-only";

import { prisma } from "@/lib/prisma";

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
