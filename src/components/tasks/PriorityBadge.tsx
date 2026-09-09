import { TASK_PRIORITY_BADGE, TASK_PRIORITY_LABEL } from "@/lib/task-priority";
import type { TaskPriority } from "@/lib/task-priority";
import { cn } from "@/lib/utils";

export interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium",
        TASK_PRIORITY_BADGE[priority],
        className,
      )}
    >
      {TASK_PRIORITY_LABEL[priority]}
    </span>
  );
}
