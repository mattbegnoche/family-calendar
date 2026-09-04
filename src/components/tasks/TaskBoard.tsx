"use client";

import { useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import { addTask, removeTask, toggleTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface BoardTask {
  id: string;
  title: string;
  icon: string | null;
  isComplete: boolean;
}

/** One column per household member, including the shared "Household" row. */
export interface BoardColumn {
  memberId: string;
  name: string;
  color: string;
  tasks: BoardTask[];
}

export function TaskBoard({ columns }: { columns: readonly BoardColumn[] }) {
  return (
    <div className="grid h-full auto-rows-fr grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:auto-rows-auto">
      {columns.map((column) => (
        <TaskColumn key={column.memberId} column={column} />
      ))}
    </div>
  );
}

function TaskColumn({ column }: { column: BoardColumn }) {
  const done = column.tasks.filter((task) => task.isComplete).length;
  const total = column.tasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section className="flex min-h-0 flex-col gap-3 rounded-2xl border bg-card p-3">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h2 className="min-w-0 flex-1 truncate font-semibold">{column.name}</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {done}/{total}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${column.name} progress`}
        >
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${percent}%`, backgroundColor: column.color }}
          />
        </div>
      </header>

      <ul className="flex flex-1 flex-col gap-2">
        {column.tasks.map((task) => (
          <TaskRow key={task.id} task={task} color={column.color} />
        ))}
        {total === 0 ? (
          <li className="py-3 text-center text-sm text-muted-foreground">
            Nothing yet
          </li>
        ) : null}
      </ul>

      <AddTaskForm memberId={column.memberId} memberName={column.name} />
    </section>
  );
}

function TaskRow({ task, color }: { task: BoardTask; color: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li
      className={cn(
        "group flex items-center gap-2.5 rounded-xl border bg-background p-2.5",
        isPending && "opacity-60",
      )}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <button
        type="button"
        aria-label={task.isComplete ? `Reopen ${task.title}` : `Complete ${task.title}`}
        onClick={() =>
          startTransition(() => {
            void toggleTask(task.id, !task.isComplete);
          })
        }
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          task.isComplete
            ? "border-transparent text-white"
            : "border-muted-foreground/30 hover:border-current",
        )}
        style={task.isComplete ? { backgroundColor: color } : undefined}
      >
        {task.isComplete ? <Check className="size-3.5" /> : null}
      </button>

      {task.icon ? (
        <span aria-hidden className="text-lg leading-none">
          {task.icon}
        </span>
      ) : null}

      <p
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          task.isComplete && "line-through opacity-60",
        )}
      >
        {task.title}
      </p>

      <button
        type="button"
        aria-label={`Delete ${task.title}`}
        onClick={() =>
          startTransition(() => {
            void removeTask(task.id);
          })
        }
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function AddTaskForm({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  return (
    <form
      action={addTask}
      className="flex gap-2 border-t pt-3"
      onSubmit={(event) => {
        const form = event.currentTarget;
        requestAnimationFrame(() => form.reset());
      }}
    >
      {/* The column IS the assignee, so nothing to pick. */}
      <input type="hidden" name="memberId" value={memberId} />
      <Input
        name="icon"
        maxLength={4}
        placeholder="🦷"
        aria-label={`Emoji for ${memberName}`}
        className="w-12 shrink-0 px-1 text-center"
      />
      <Input
        name="title"
        placeholder="Add a task"
        aria-label={`New task for ${memberName}`}
        required
      />
      <Button type="submit" size="icon" variant="secondary" aria-label={`Add task for ${memberName}`}>
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
