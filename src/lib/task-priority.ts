/**
 * Task priority. Imported by both the server actions that validate it and the
 * client components that render it, so no "server-only" here.
 */

/** Display order: most urgent first, which is also the sort order in a list. */
export const TASK_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Matches the column default, so an untriaged task reads as "normal". */
export const DEFAULT_TASK_PRIORITY: TaskPriority = "MEDIUM";

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/**
 * Lower sorts first. Derived from the array above rather than hand-numbered, so
 * reordering TASK_PRIORITIES cannot silently disagree with the sort.
 */
export const TASK_PRIORITY_RANK: Record<TaskPriority, number> = Object.fromEntries(
  TASK_PRIORITIES.map((priority, index) => [priority, index]),
) as Record<TaskPriority, number>;

/**
 * Badge styling. Static class strings, not interpolated colours: Tailwind
 * generates classes at build time, so `bg-${colour}-500` would produce nothing.
 */
export const TASK_PRIORITY_BADGE: Record<TaskPriority, string> = {
  URGENT: "bg-red-500/15 text-red-700 dark:text-red-400",
  HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  MEDIUM: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  LOW: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

/** The left rail on a card — the at-a-glance signal on a wall display. */
export const TASK_PRIORITY_RAIL: Record<TaskPriority, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-sky-500",
  LOW: "bg-slate-400",
};

export function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" &&
    (TASK_PRIORITIES as readonly string[]).includes(value)
  );
}

/** Falls back to the default rather than throwing on an unexpected value. */
export function toTaskPriority(value: unknown): TaskPriority {
  return isTaskPriority(value) ? value : DEFAULT_TASK_PRIORITY;
}
