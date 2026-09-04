"use server";

import { revalidatePath } from "next/cache";

import { requireHousehold } from "@/lib/household";
import {
  createTask,
  deleteTask,
  setTaskCompletion,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@/lib/tasks";

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
