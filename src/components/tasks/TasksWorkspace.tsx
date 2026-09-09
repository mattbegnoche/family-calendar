"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react";
import { List, Plus, SquareKanban, type LucideIcon } from "lucide-react";

import {
  changeTaskPriority,
  moveTask,
  removeTask,
  toggleTask,
} from "@/app/actions/tasks";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskListView } from "@/components/tasks/TaskListView";
import {
  ANY,
  EMPTY_FILTERS,
  TaskFilters,
  type FilterMember,
  type TaskFilterState,
} from "@/components/tasks/TaskFilters";
import { Button } from "@/components/ui/button";
import {
  TASK_VIEW_MODES,
  TASK_VIEW_MODE_LABEL,
  type TaskItem,
  type TaskViewMode,
} from "@/lib/task-item";
import type { TaskPriority } from "@/lib/task-priority";
import type { TaskStatus } from "@/lib/task-status";
import { cn } from "@/lib/utils";

const VIEW_ICON: Record<TaskViewMode, LucideIcon> = {
  board: SquareKanban,
  list: List,
};

/**
 * Where an unscheduled task lands when it is dragged into Scheduled.
 *
 * Computed in the browser, so "9am" is the user's own 9am. The server runs in
 * UTC and has no business deciding this.
 */
const DEFAULT_SCHEDULE_HOUR = 9;

function defaultScheduleTime(): Date {
  const when = new Date();
  when.setHours(DEFAULT_SCHEDULE_HOUR, 0, 0, 0);
  return when;
}

/** The task editor: closed, creating, or editing one task. */
type TaskEditor =
  | { readonly kind: "closed" }
  | { readonly kind: "create" }
  | { readonly kind: "edit"; readonly task: TaskItem };

const EDITOR_CLOSED: TaskEditor = { kind: "closed" };

type TaskPatch =
  | { readonly kind: "update"; readonly id: string; readonly changes: Partial<TaskItem> }
  | { readonly kind: "remove"; readonly id: string };

/** Always returns a new array — the optimistic list must never be mutated. */
function applyPatch(current: readonly TaskItem[], patch: TaskPatch): TaskItem[] {
  if (patch.kind === "remove") {
    return current.filter((task) => task.id !== patch.id);
  }
  return current.map((task) =>
    task.id === patch.id ? { ...task, ...patch.changes } : task,
  );
}

function matches(
  task: TaskItem,
  filters: TaskFilterState,
  useStatusFilter: boolean,
): boolean {
  if (filters.memberId !== ANY && task.memberId !== filters.memberId) return false;
  if (filters.priority !== ANY && task.priority !== filters.priority) return false;
  if (useStatusFilter && filters.status !== ANY && task.status !== filters.status) {
    return false;
  }

  const query = filters.query.trim().toLowerCase();
  if (!query) return true;
  return (
    task.title.toLowerCase().includes(query) ||
    (task.notes?.toLowerCase().includes(query) ?? false)
  );
}

export interface TasksWorkspaceProps {
  tasks: readonly TaskItem[];
  members: readonly FilterMember[];
  /** A task to open the editor on straight away, from `/tasks?edit=<id>`. */
  initialEditTaskId?: string | null;
}

const TASKS_PATH = "/tasks";

export function TasksWorkspace({ tasks, members, initialEditTaskId = null }: TasksWorkspaceProps) {
  // Local state, like MyCalendar's own view/date — the tasks page is meant to
  // feel like the calendar page, and that one does not put view in the URL.
  const [mode, setMode] = useState<TaskViewMode>("board");
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const [editor, setEditor] = useState<TaskEditor>(() => {
    const linked = initialEditTaskId
      ? tasks.find((task) => task.id === initialEditTaskId)
      : undefined;
    return linked ? { kind: "edit", task: linked } : EDITOR_CLOSED;
  });
  const [, startTransition] = useTransition();
  const router = useRouter();
  const closeEditor = useCallback(() => {
    setEditor(EDITOR_CLOSED);
    // Arrived via the calendar's link: leave the URL clean once the editor closes.
    if (initialEditTaskId) router.replace(TASKS_PATH);
  }, [initialEditTaskId, router]);

  // Every mutation is a server action followed by revalidatePath, which is a
  // full round trip. useOptimistic makes the card move the instant it is
  // dropped and reconciles when the fresh data arrives.
  const [optimisticTasks, applyOptimistic] = useOptimistic(tasks, applyPatch);

  const useStatusFilter = mode === "list";
  const visibleTasks = useMemo(
    () => optimisticTasks.filter((task) => matches(task, filters, useStatusFilter)),
    [optimisticTasks, filters, useStatusFilter],
  );

  const handleMove = (task: TaskItem, status: TaskStatus) => {
    if (task.status === status) return;
    startTransition(async () => {
      applyOptimistic({
        kind: "update",
        id: task.id,
        // Moving to the backlog clears the date, so the label must go with it.
        changes:
          status === "BACKLOG"
            ? { status, dueLabel: null, dueAtMs: null }
            : { status },
      });
      await moveTask(task.id, status, defaultScheduleTime());
    });
  };

  const handleToggleComplete = (task: TaskItem) => {
    const isComplete = task.status === "COMPLETED";
    // Re-opening returns it to whichever column its date implies.
    const reopenedStatus: TaskStatus = task.dueAtMs !== null ? "SCHEDULED" : "BACKLOG";

    startTransition(async () => {
      applyOptimistic({
        kind: "update",
        id: task.id,
        changes: { status: isComplete ? reopenedStatus : "COMPLETED" },
      });
      await toggleTask(task.id, !isComplete);
    });
  };

  const handlePriorityChange = (task: TaskItem, priority: TaskPriority) => {
    startTransition(async () => {
      applyOptimistic({ kind: "update", id: task.id, changes: { priority } });
      await changeTaskPriority(task.id, priority);
    });
  };

  const handleEdit = (task: TaskItem) => setEditor({ kind: "edit", task });

  const handleDelete = (task: TaskItem) => {
    startTransition(async () => {
      applyOptimistic({ kind: "remove", id: task.id });
      await removeTask(task.id);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <h1 className="mr-auto font-semibold">Tasks</h1>

        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {TASK_VIEW_MODES.map((candidate) => {
            const Icon = VIEW_ICON[candidate];
            const isActive = candidate === mode;
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => setMode(candidate)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition",
                  isActive
                    ? "bg-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {TASK_VIEW_MODE_LABEL[candidate]}
              </button>
            );
          })}
        </div>

        {/* Top right, where the calendar keeps "New event". */}
        <Button type="button" size="sm" onClick={() => setEditor({ kind: "create" })}>
          <Plus />
          Add task
        </Button>
      </header>

      <TaskFilters
        filters={filters}
        onChange={setFilters}
        members={members}
        matchCount={visibleTasks.length}
        totalCount={optimisticTasks.length}
        showStatusFilter={useStatusFilter}
      />

      <div className="flex min-h-0 flex-1 flex-col p-2.5">
        {mode === "board" ? (
          <KanbanBoard
            tasks={visibleTasks}
            onMove={handleMove}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <TaskListView
            tasks={visibleTasks}
            onMove={handleMove}
            onPriorityChange={handlePriorityChange}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Mounted per open, so the form starts from the task being edited. */}
      {editor.kind !== "closed" ? (
        <TaskDialog
          members={members}
          task={editor.kind === "edit" ? editor.task : null}
          seed={null}
          onClose={closeEditor}
        />
      ) : null}
    </div>
  );
}
