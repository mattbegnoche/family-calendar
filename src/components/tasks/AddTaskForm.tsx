"use client";

import { Plus } from "lucide-react";

import { addTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FilterMember } from "@/components/tasks/TaskFilters";
import { DEFAULT_TASK_PRIORITY, TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/task-priority";

const SELECT_CLASS =
  "h-8 rounded-md border border-border bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export interface AddTaskFormProps {
  members: readonly FilterMember[];
}

/**
 * New tasks always land in the backlog: no date is set, and BACKLOG is defined
 * as "no date, not done". Scheduling is a separate, deliberate act — dragging
 * it into the Scheduled column, which is also what puts it on the calendar.
 */
export function AddTaskForm({ members }: AddTaskFormProps) {
  return (
    <form
      action={addTask}
      onSubmit={(event) => {
        const form = event.currentTarget;
        // After the action is dispatched, not before — resetting synchronously
        // would clear the fields out from under the submission.
        requestAnimationFrame(() => form.reset());
      }}
      className="flex flex-wrap items-center gap-2 border-t px-3 py-2"
    >
      <Input
        name="icon"
        maxLength={4}
        placeholder="🦷"
        aria-label="Emoji"
        className="h-8 w-12 shrink-0 px-1 text-center"
      />
      <Input
        name="title"
        placeholder="Add a task to the backlog"
        aria-label="New task"
        required
        className="h-8 min-w-40 flex-1"
      />

      <select name="memberId" aria-label="Assign to" required className={SELECT_CLASS}>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      <select
        name="priority"
        aria-label="Priority"
        defaultValue={DEFAULT_TASK_PRIORITY}
        className={SELECT_CLASS}
      >
        {TASK_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {TASK_PRIORITY_LABEL[priority]}
          </option>
        ))}
      </select>

      <Button type="submit" size="sm">
        <Plus className="size-4" />
        Add
      </Button>
    </form>
  );
}
