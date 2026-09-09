/**
 * The three Kanban columns.
 *
 * Status is DERIVED, not stored. A task already carries `completedAt` and
 * `dueAt`, and those two answer the question completely:
 *
 *   COMPLETED  someone checked it off
 *   SCHEDULED  it has a date, which is exactly what puts it on the calendar
 *   BACKLOG    neither — it needs doing, but not at a particular time
 *
 * Adding a status column would create a second source of truth that could
 * disagree with the date a task is actually shown on. "Scheduled" meaning
 * "appears on the calendar" is the property worth preserving.
 */

export const TASK_STATUSES = ["BACKLOG", "SCHEDULED", "COMPLETED"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
};

export const TASK_STATUS_HINT: Record<TaskStatus, string> = {
  BACKLOG: "No date yet",
  SCHEDULED: "On the calendar",
  COMPLETED: "Done",
};

export interface TaskStatusFields {
  readonly completedAt: Date | string | null;
  readonly dueAt: Date | string | null;
}

export function taskStatusOf(task: TaskStatusFields): TaskStatus {
  if (task.completedAt) return "COMPLETED";
  if (task.dueAt) return "SCHEDULED";
  return "BACKLOG";
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value)
  );
}
