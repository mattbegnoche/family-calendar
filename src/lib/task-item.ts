import { TASK_PRIORITY_RANK, type TaskPriority } from "@/lib/task-priority";
import type { TaskStatus } from "@/lib/task-status";

/**
 * One task as the tasks page renders it.
 *
 * A flat, client-safe projection of TaskRecord. `dueLabel` is preformatted on
 * the server in the HOUSEHOLD's time zone rather than passed as a Date and
 * formatted in the browser: formatting on the client would render one string
 * during SSR and another after hydration whenever the two zones differ, and
 * Household.timeZone is the answer this app has already decided is correct.
 */
export interface TaskItem {
  readonly id: string;
  readonly title: string;
  readonly icon: string | null;
  readonly notes: string | null;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly dueLabel: string | null;
  /**
   * The same instant as epoch milliseconds, for ordering the Scheduled column
   * chronologically. A number rather than a Date because it crosses the server
   * boundary, and sorting on the formatted label would order "Apr" before "Jan".
   */
  readonly dueAtMs: number | null;
  readonly memberId: string;
  readonly memberName: string;
  readonly memberColor: string;
  readonly completedByName: string | null;
}

/** The two ways of looking at the same tasks. */
export const TASK_VIEW_MODES = ["board", "list"] as const;

export type TaskViewMode = (typeof TASK_VIEW_MODES)[number];

export const TASK_VIEW_MODE_LABEL: Record<TaskViewMode, string> = {
  board: "Board",
  list: "List",
};

/**
 * Most urgent first, then earliest date, then title.
 *
 * Shared by the board and the list so the two views cannot disagree about
 * ordering. The title tiebreak keeps it stable, which matters because both
 * views re-sort on every optimistic update.
 */
export function compareTasks(a: TaskItem, b: TaskItem): number {
  const byPriority = TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;

  if (a.dueAtMs !== null && b.dueAtMs !== null && a.dueAtMs !== b.dueAtMs) {
    return a.dueAtMs - b.dueAtMs;
  }
  // A dated task outranks an undated one at the same priority.
  if (a.dueAtMs !== null && b.dueAtMs === null) return -1;
  if (a.dueAtMs === null && b.dueAtMs !== null) return 1;

  return a.title.localeCompare(b.title);
}
