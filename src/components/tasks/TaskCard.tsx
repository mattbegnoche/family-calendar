"use client";

import { Check, Clock, Trash2 } from "lucide-react";

import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import type { TaskItem } from "@/lib/task-item";
import { TASK_PRIORITY_RAIL } from "@/lib/task-priority";
import { cn } from "@/lib/utils";

export interface TaskCardProps {
  task: TaskItem;
  onToggleComplete: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onDragStart: (task: TaskItem) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

/**
 * A card on the Kanban board.
 *
 * The whole card is the drag target rather than a small grip, which is what
 * makes the board usable on a touchscreen. The two buttons stop propagation on
 * mousedown so pressing them cannot start a drag instead of firing the click.
 */
export function TaskCard({
  task,
  onToggleComplete,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
}: TaskCardProps) {
  const isComplete = task.status === "COMPLETED";

  return (
    <li
      draggable
      onDragStart={(event) => {
        // text/plain keeps the drag valid in browsers that ignore custom types.
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(task);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex cursor-grab flex-col gap-2 overflow-hidden rounded-xl border bg-background p-2.5 pl-3.5 shadow-xs transition active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {/* Priority as a colour rail — readable across a room, which is the
          point on a wall-mounted display. */}
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", TASK_PRIORITY_RAIL[task.priority])}
      />

      <div className="flex items-start gap-2">
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => onToggleComplete(task)}
          aria-label={isComplete ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isComplete
              ? "border-transparent text-white"
              : "border-muted-foreground/30 hover:border-current",
          )}
          style={isComplete ? { backgroundColor: task.memberColor } : undefined}
        >
          {isComplete ? <Check className="size-3" strokeWidth={3} /> : null}
        </button>

        {task.icon ? (
          <span aria-hidden className="text-base leading-tight">
            {task.icon}
          </span>
        ) : null}

        <p
          className={cn(
            "min-w-0 flex-1 text-sm leading-snug",
            isComplete && "line-through opacity-60",
          )}
        >
          {task.title}
        </p>

        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-7 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: task.memberColor }}
          />
          {task.memberName}
        </span>

        <PriorityBadge priority={task.priority} />

        {task.dueLabel ? (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {task.dueLabel}
          </span>
        ) : null}
      </div>
    </li>
  );
}
