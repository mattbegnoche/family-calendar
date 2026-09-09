"use client";

import { Check, Clock, Repeat, Trash2 } from "lucide-react";

import { TaskIcon } from "@/components/tasks/TaskIcon";
import { compareTasks, type TaskItem } from "@/lib/task-item";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_RAIL,
  type TaskPriority,
} from "@/lib/task-priority";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type TaskStatus,
} from "@/lib/task-status";
import { cn } from "@/lib/utils";

export interface TaskListViewProps {
  tasks: readonly TaskItem[];
  onMove: (task: TaskItem, status: TaskStatus) => void;
  onPriorityChange: (task: TaskItem, priority: TaskPriority) => void;
  onToggleComplete: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}

const ROW_SELECT =
  "h-7 rounded-md border border-border bg-background px-1.5 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * The detail view: every field a task has is editable inline here.
 *
 * The status and priority selects are also the keyboard-accessible way to do
 * what dragging does on the board — the board's drag-and-drop is a pointer-only
 * affordance, so without these there would be no way to move a task without a
 * mouse.
 */
export function TaskListView({
  tasks,
  onMove,
  onPriorityChange,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">No tasks match these filters.</p>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto">
      {[...tasks].sort(compareTasks).map((task) => {
        const isComplete = task.status === "COMPLETED";

        return (
          <li
            key={task.id}
            className="group flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
          >
            <span
              aria-hidden
              className={cn(
                "h-7 w-1 shrink-0 rounded-full",
                TASK_PRIORITY_RAIL[task.priority],
              )}
            />

            <button
              type="button"
              onClick={() => onToggleComplete(task)}
              aria-label={
                isComplete ? `Reopen ${task.title}` : `Complete ${task.title}`
              }
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                isComplete
                  ? "border-transparent text-white"
                  : "border-muted-foreground/30 hover:border-current",
              )}
              style={isComplete ? { backgroundColor: task.memberColor } : undefined}
            >
              {isComplete ? <Check className="size-3" strokeWidth={3} /> : null}
            </button>

            <TaskIcon iconKey={task.icon} className="size-4 shrink-0 text-muted-foreground" />

            <button
              type="button"
              onClick={() => onEdit(task)}
              className={cn(
                "min-w-40 flex-1 text-left text-sm hover:underline",
                isComplete && "line-through opacity-60",
              )}
            >
              {task.title}
            </button>

            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: task.memberColor }}
              />
              {task.memberName}
            </span>

            {task.dueLabel ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {task.dueLabel}
              </span>
            ) : null}

            {task.repeatLabel ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Repeat className="size-3" />
                {task.repeatLabel}
              </span>
            ) : null}

            <select
              value={task.priority}
              onChange={(event) =>
                onPriorityChange(task, event.target.value as TaskPriority)
              }
              aria-label={`Priority for ${task.title}`}
              className={ROW_SELECT}
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {TASK_PRIORITY_LABEL[priority]}
                </option>
              ))}
            </select>

            <select
              value={task.status}
              onChange={(event) => onMove(task, event.target.value as TaskStatus)}
              aria-label={`Status for ${task.title}`}
              className={ROW_SELECT}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABEL[status]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label={`Delete ${task.title}`}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
