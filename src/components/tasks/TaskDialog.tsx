"use client";

import { Dialog } from "@/components/Dialog";
import { TaskForm, type TaskFormMember, type TaskSeed } from "@/components/tasks/TaskForm";
import type { TaskFormValues } from "@/lib/task-item";

export interface TaskDialogProps {
  readonly members: readonly TaskFormMember[];
  readonly task: TaskFormValues | null;
  readonly seed: TaskSeed | null;
  readonly onClose: () => void;
}

/** The task editor in a modal. Mount it only while open so the form starts from `task` or `seed`. */
export function TaskDialog({ members, task, seed, onClose }: TaskDialogProps) {
  const title = task ? "Edit task" : "New task";
  return (
    <Dialog isOpen onClose={onClose} label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <TaskForm members={members} task={task} seed={seed} onSaved={onClose} onCancel={onClose} />
    </Dialog>
  );
}
