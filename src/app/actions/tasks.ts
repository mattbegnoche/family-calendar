"use server";

import { revalidatePath } from "next/cache";

import { readFormString, toActionState, type SaveActionState } from "@/lib/action-state";
import { UserFacingError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { DEFAULT_TASK_DURATION_MINUTES, isTaskDuration } from "@/lib/task-duration";
import { isTaskIconKey } from "@/lib/task-icons";
import {
  currentTaskOccurrence,
  isRepeating,
  normalizeRepeatRule,
  type RepeatFields,
} from "@/lib/task-occurrences";
import { toTaskPriority, type TaskPriority } from "@/lib/task-priority";
import {
  MAX_REPEAT_INTERVAL,
  isRepeatFrequency,
  isWeekday,
} from "@/lib/task-recurrence";
import { isTaskStatus, type TaskStatus } from "@/lib/task-status";
import {
  createTask,
  deleteTask,
  findTaskSchedule,
  moveTaskToStatus,
  setOccurrenceCompletion,
  setTaskCompletion,
  setTaskDueAt,
  setTaskPriority,
  TIMES_OF_DAY,
  updateTask,
  type TaskInput,
  type TimeOfDay,
} from "@/lib/tasks";

const MAX_TITLE_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;
const TASKS_PATH = "/tasks";
const CALENDAR_PATH = "/calendar";
const LOG_TAG = "tasks";

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

function revalidateBoth(): void {
  revalidatePath(TASKS_PATH);
  revalidatePath(CALENDAR_PATH);
}

/** An ISO instant from a hidden field, or null when the field is blank. */
function readInstant(formData: FormData, key: string): Date | null {
  const raw = readFormString(formData, key);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new UserFacingError("That is not a valid date.");
  return date;
}

function readRepeat(formData: FormData, dueAt: Date): RepeatFields | undefined {
  const frequency = readFormString(formData, "repeatFrequency");
  if (!frequency) return undefined;
  if (!isRepeatFrequency(frequency)) throw new UserFacingError("Pick how often it repeats.");

  const interval = Number(readFormString(formData, "repeatInterval") || "1");
  if (!Number.isInteger(interval) || interval < 1 || interval > MAX_REPEAT_INTERVAL) {
    throw new UserFacingError(`Repeat every 1 to ${MAX_REPEAT_INTERVAL}.`);
  }

  const weekdays = formData
    .getAll("repeatWeekdays")
    .map((value) => Number(value))
    .filter(isWeekday);

  const until = readInstant(formData, "repeatUntil");
  if (until && until < dueAt) {
    throw new UserFacingError("The repeat has to end after it starts.");
  }

  return normalizeRepeatRule({ frequency, interval, weekdays, until }, dueAt);
}

/** Everything the task form submits, validated. Throws UserFacingError for the form to show. */
function readTaskInput(
  formData: FormData,
  members: readonly { id: string }[],
): TaskInput {
  const title = readFormString(formData, "title");
  if (!title) throw new UserFacingError("A task needs a title.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new UserFacingError(`Keep the title under ${MAX_TITLE_LENGTH} characters.`);
  }

  const memberId = readFormString(formData, "memberId");
  if (!members.some((member) => member.id === memberId)) {
    throw new UserFacingError("Pick someone in this household.");
  }

  const notes = readFormString(formData, "notes");
  if (notes.length > MAX_NOTES_LENGTH) {
    throw new UserFacingError(`Keep the notes under ${MAX_NOTES_LENGTH} characters.`);
  }

  const icon = readFormString(formData, "icon");
  // "scheduled" is the checkbox that reveals the date fields; without it any
  // date left in the hidden inputs is stale and ignored.
  const isScheduled = readFormString(formData, "scheduled") === "on";
  const dueAt = isScheduled ? readInstant(formData, "dueAt") : null;
  if (isScheduled && !dueAt) throw new UserFacingError("Pick a date for the calendar.");

  const dueAllDay = dueAt ? readFormString(formData, "dueAllDay") === "on" : true;
  const duration = Number(readFormString(formData, "durationMinutes") || DEFAULT_TASK_DURATION_MINUTES);
  if (dueAt && !dueAllDay && !isTaskDuration(duration)) {
    throw new UserFacingError("Pick how long the task takes.");
  }

  return {
    title,
    memberId,
    timeOfDay: readTimeOfDay(formData.get("timeOfDay")),
    // Falls back to MEDIUM rather than rejecting: an unset priority means
    // "normal", which is a valid thing for the form to leave alone.
    priority: toTaskPriority(formData.get("priority")),
    icon: isTaskIconKey(icon) ? icon : null,
    notes: notes || null,
    dueAt,
    dueAllDay,
    durationMinutes: dueAt && !dueAllDay ? duration : DEFAULT_TASK_DURATION_MINUTES,
    repeat: dueAt ? readRepeat(formData, dueAt) : undefined,
  };
}

/**
 * Create, or with a `taskId`, overwrite. One action for both so the same form
 * serves the tasks page and the calendar's task tab.
 */
export async function saveTaskAction(
  _previous: SaveActionState,
  formData: FormData,
): Promise<SaveActionState> {
  try {
    const { household, userId } = await requireHousehold();
    const input = readTaskInput(formData, household.members);
    const taskId = readFormString(formData, "taskId");

    if (taskId) await updateTask(household.id, taskId, input);
    else await createTask(household.id, userId, input);
  } catch (error) {
    return { ...toActionState(error, LOG_TAG), savedAt: null };
  }

  revalidateBoth();
  return { error: null, savedAt: Date.now() };
}

/**
 * Check a task off, or reopen it. For a repeating task this is the CURRENT
 * occurrence — today's, or the next one — since the task itself is never
 * "done"; see TaskCompletion in the schema.
 */
export async function toggleTask(taskId: string, isComplete: boolean) {
  const { household, userId } = await requireHousehold();
  const completedByMemberId = currentMemberId(household.members, userId);

  const schedule = await findTaskSchedule(household.id, taskId);
  if (!schedule) throw new Error(`No task ${taskId} in this household`);

  if (isRepeating(schedule) && schedule.dueAt) {
    const occurrence = currentTaskOccurrence(schedule, [], new Date(), household.timeZone);
    if (occurrence) {
      await setOccurrenceCompletion(
        household.id,
        taskId,
        occurrence.start,
        isComplete,
        completedByMemberId,
      );
    }
  } else {
    await setTaskCompletion(household.id, taskId, isComplete, completedByMemberId);
  }

  revalidateBoth();
}

/** From the calendar: check off one specific occurrence, or the task itself when it does not repeat. */
export async function toggleTaskOccurrence(
  taskId: string,
  occurrenceStartMs: number | null,
  isComplete: boolean,
) {
  const { household, userId } = await requireHousehold();
  const completedByMemberId = currentMemberId(household.members, userId);

  if (occurrenceStartMs === null) {
    await setTaskCompletion(household.id, taskId, isComplete, completedByMemberId);
  } else {
    await setOccurrenceCompletion(
      household.id,
      taskId,
      new Date(occurrenceStartMs),
      isComplete,
      completedByMemberId,
    );
  }

  revalidateBoth();
}

export async function removeTask(taskId: string) {
  const { household } = await requireHousehold();
  await deleteTask(household.id, taskId);
  revalidateBoth();
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

  // Dropping a repeating task on Completed means "today's is done", not "the
  // series is over" — that is what toggleTask already encodes.
  const schedule = await findTaskSchedule(household.id, taskId);
  if (schedule && isRepeating(schedule) && status === "COMPLETED") {
    await toggleTask(taskId, true);
    return;
  }

  await moveTaskToStatus(household.id, taskId, status satisfies TaskStatus, {
    completedByMemberId: currentMemberId(household.members, userId),
    fallbackDueAt,
  });

  revalidateBoth();
}

export async function changeTaskPriority(taskId: string, priority: string) {
  const { household } = await requireHousehold();
  await setTaskPriority(household.id, taskId, toTaskPriority(priority) satisfies TaskPriority);
  revalidatePath(TASKS_PATH);
}

/** Passing null clears the date, which moves the task back to the backlog. */
export async function rescheduleTask(taskId: string, dueAt: Date | null) {
  const { household } = await requireHousehold();
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    throw new Error("That is not a valid date.");
  }

  await setTaskDueAt(household.id, taskId, dueAt);
  revalidateBoth();
}
