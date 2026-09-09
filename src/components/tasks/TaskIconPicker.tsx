"use client";

import { TaskIcon } from "@/components/tasks/TaskIcon";
import { TASK_ICON_KEYS } from "@/lib/task-icons";
import { cn } from "@/lib/utils";

export interface TaskIconPickerProps {
  readonly value: string;
  readonly onChange: (key: string) => void;
  /** Field name for the hidden input that carries the choice to the action. */
  readonly name: string;
  readonly label: string;
}

/** A grid of the allow-listed task icons; the pressed one is the choice. */
export function TaskIconPicker({ value, onChange, name, label }: TaskIconPickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <input type="hidden" name={name} value={value} />
      <div className="grid max-h-36 grid-cols-8 gap-1 overflow-y-auto rounded-lg border p-1.5 sm:grid-cols-10">
        {TASK_ICON_KEYS.map((key) => {
          const isSelected = key === value;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={key}
              onClick={() => onChange(key)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md transition-colors hover:bg-muted",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              <TaskIcon iconKey={key} className="size-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
