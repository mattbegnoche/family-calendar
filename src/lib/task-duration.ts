/**
 * How long a timed task's block is. Shared by the form (the choices it
 * offers), the action (what it accepts) and the adapter (what it draws).
 */

/** What a task is drawn as when nobody chose: a short, checkable block. */
export const DEFAULT_TASK_DURATION_MINUTES = 30;
export const MIN_TASK_DURATION_MINUTES = 5;
/** A whole day. Longer than that is an all-day task, not a long block. */
export const MAX_TASK_DURATION_MINUTES = 24 * 60;

/** The lengths the form offers outright; anything else arrives from a drag on the grid. */
export const TASK_DURATION_PRESETS: readonly number[] = [15, 30, 45, 60, 90, 120, 180, 240];

export function isTaskDuration(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TASK_DURATION_MINUTES &&
    value <= MAX_TASK_DURATION_MINUTES
  );
}

/** Whole minutes between two instants, clamped to what a task may be. */
export function durationBetween(start: Date, end: Date): number {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return Math.min(MAX_TASK_DURATION_MINUTES, Math.max(MIN_TASK_DURATION_MINUTES, minutes));
}

/** "30 min", "1 hr", "1 hr 30 min", "24 hr". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

/** The presets plus `current`, sorted, so a select can always show the stored value. */
export function durationChoices(current: number): number[] {
  return [...new Set([...TASK_DURATION_PRESETS, current])].sort((a, b) => a - b);
}
