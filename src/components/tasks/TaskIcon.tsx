import { createElement } from "react";

import { taskIcon } from "@/lib/task-icons";

export interface TaskIconProps {
  /** A key into TASK_ICONS; null, or an old emoji value, draws the default. */
  iconKey: string | null | undefined;
  className?: string;
}

/**
 * A task's icon by key. createElement rather than `const Icon = taskIcon(key)`
 * followed by `<Icon />`, for the reason HouseholdGlyph gives: the lookup
 * returns a module-level component, and this form makes that verifiable.
 */
export function TaskIcon({ iconKey, className }: TaskIconProps) {
  return createElement(taskIcon(iconKey), { className, "aria-hidden": true });
}
