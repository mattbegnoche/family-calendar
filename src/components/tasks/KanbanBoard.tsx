"use client";

import { useState } from "react";

import { TaskCard } from "@/components/tasks/TaskCard";
import { compareTasks, type TaskItem } from "@/lib/task-item";
import {
  TASK_STATUSES,
  TASK_STATUS_HINT,
  TASK_STATUS_LABEL,
  type TaskStatus,
} from "@/lib/task-status";
import { cn } from "@/lib/utils";

export interface KanbanBoardProps {
  tasks: readonly TaskItem[];
  onMove: (task: TaskItem, status: TaskStatus) => void;
  onToggleComplete: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}

export function KanbanBoard({
  tasks,
  onMove,
  onToggleComplete,
  onDelete,
}: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const handleDrop = (status: TaskStatus) => {
    const task = tasks.find((candidate) => candidate.id === draggingId);
    setDraggingId(null);
    setDropTarget(null);
    // Dropping a card back where it started is a no-op, not a write.
    if (task && task.status !== status) onMove(task, status);
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-auto md:grid-cols-3 md:overflow-hidden">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks
          .filter((task) => task.status === status)
          .sort(compareTasks);

        return (
          <section
            key={status}
            onDragOver={(event) => {
              // Without preventDefault the browser refuses the drop outright.
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget(status);
            }}
            onDragLeave={(event) => {
              // Ignore bubbling from children, or the highlight flickers as the
              // pointer crosses each card.
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              setDropTarget((current) => (current === status ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(status);
            }}
            className={cn(
              "flex min-h-0 flex-col rounded-2xl border bg-card transition-colors",
              dropTarget === status && "border-primary bg-primary/5",
            )}
          >
            <header className="flex shrink-0 items-baseline gap-2 border-b px-3 py-2.5">
              <h2 className="font-semibold">{TASK_STATUS_LABEL[status]}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {columnTasks.length}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {TASK_STATUS_HINT[status]}
              </span>
            </header>

            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                  onDragStart={(dragged) => setDraggingId(dragged.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTarget(null);
                  }}
                  isDragging={draggingId === task.id}
                />
              ))}

              {columnTasks.length === 0 ? (
                <li className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
                  Drop a task here
                </li>
              ) : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
