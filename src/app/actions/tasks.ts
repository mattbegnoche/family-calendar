"use server";

import { revalidatePath } from "next/cache";

import { requireHousehold } from "@/lib/household";
import {
  createTask,
  deleteTask,
  moveTaskToStatus,
  setTaskCompletion,
  setTaskDueAt,
  setTaskPriority,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@/lib/tasks";
import { toTaskPriority, type TaskPriority } from "@/lib/task-priority";
import { isTaskStatus, type TaskStatus } from "@/lib/task-status";

const MAX_TITLE_LENGTH = 200;

/**
 * The board groups by member, not by time of day, so the form does not ask for
 * one. The column still exists on Task; this keeps it valid without making the
 * UI collect something nobody wants to fill in.
 */
const DEFAULT_TIME_OF_DAY: TimeOfDay = "MORNING";

function readTimeOfDay(value: unknown): TimeOfDay {
  if (typeof value === "string" && (TIMES_OF_DAY as readonly string[]).includes(value)) {
    return value as TimeOfDay;
  }
  return DEFAULT_TIME_OF_DAY;
}

/** The member row for the signed-in user, when their login is linked to one. */
function currentMemberId(
  members: readonly { id: string; userId: string | null }[],
  userId: string,
): string | null {
  return members.find((member) => member.userId === userId)?.id ?? null;
}

export async function addTask(formData: FormData) {
  const { household, userId } = await requireHousehold();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("A task needs a title.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Keep the title under ${MAX_TITLE_LENGTH} characters.`);
  }

  const memberId = String(formData.get("memberId") ?? "");
  if (!household.members.some((member) => member.id === memberId)) {
    throw new Error("Pick someone in this household.");
  }

  const icon = String(formData.get("icon") ?? "").trim();

  await createTask(household.id, userId, {
    title,
    memberId,
    timeOfDay: readTimeOfDay(formData.get("timeOfDay")),
    // Falls back to MEDIUM rather than rejecting: an unset priority means
    // "normal", which is a valid thing for the form to leave alone.
    priority: toTaskPriority(formData.get("priority")),
    icon: icon || null,
  });

  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function toggleTask(taskId: string, isComplete: boolean) {
  const { household, userId } = await requireHousehold();
  await setTaskCompletion(
    household.id,
    taskId,
    isComplete,
    currentMemberId(household.members, userId),
  );
  revalidatePath("/tasks");
}

export async function removeTask(taskId: string) {
  const { household } = await requireHousehold();
  await deleteTask(household.id, taskId);
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

/**
 * Drag-and-drop between the board's columns.
 *
 * `fallbackDueAt` is computed in the browser and only consulted when scheduling
 * a task that has no date yet: the server runs in UTC, so it is the wrong place
 * to decide what "today at nine" means for the person doing the dragging. The
 * calendar's event actions take client-computed Dates for the same reason.
 */
export async function moveTask(
  taskId: string,
  status: string,
  fallbackDueAt: Date,
) {
  const { household, userId } = await requireHousehold();
  if (!isTaskStatus(status)) throw new Error(`Unknown task status "${status}".`);
  if (Number.isNaN(fallbackDueAt.getTime())) {
    throw new Error("That is not a valid date.");
  }

  await moveTaskToStatus(household.id, taskId, status satisfies TaskStatus, {
    completedByMemberId: currentMemberId(household.members, userId),
    fallbackDueAt,
  });

  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function changeTaskPriority(taskId: string, priority: string) {
  const { household } = await requireHousehold();
  await setTaskPriority(household.id, taskId, toTaskPriority(priority) satisfies TaskPriority);
  revalidatePath("/tasks");
}

/** Passing null clears the date, which moves the task back to the backlog. */
export async function rescheduleTask(taskId: string, dueAt: Date | null) {
  const { household } = await requireHousehold();
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    throw new Error("That is not a valid date.");
  }

  await setTaskDueAt(household.id, taskId, dueAt);
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}
