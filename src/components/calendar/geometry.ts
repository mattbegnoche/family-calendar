import { MINUTES_PER_HOUR, clampMinutes } from "@/lib/calendar/time";

/**
 * Pixels ↔ minutes for the time grid. One place, so the hour gutter, the
 * event cards and the pointer maths can never disagree about where 3 pm is.
 */

export const HOUR_HEIGHT_PX = 56;
export const GRID_HEIGHT_PX = HOUR_HEIGHT_PX * 24;

/** How far a pointer must travel before a press becomes a drag rather than a click. */
export const DRAG_THRESHOLD_PX = 4;

export function minutesToPx(minutes: number): number {
  return (minutes / MINUTES_PER_HOUR) * HOUR_HEIGHT_PX;
}

export function pxToMinutes(px: number): number {
  return clampMinutes((px / HOUR_HEIGHT_PX) * MINUTES_PER_HOUR);
}

/** The subset of DOMRect the grid needs; a plain object in tests. */
export interface GridRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

export interface GridPoint {
  readonly column: number;
  readonly minutes: number;
}

/** Which column and which minute of the day a pointer position falls on. Clamped to the grid. */
export function locateInGrid(
  rect: GridRect,
  columnCount: number,
  clientX: number,
  clientY: number,
): GridPoint {
  const columnWidth = rect.width / Math.max(1, columnCount);
  const rawColumn = Math.floor((clientX - rect.left) / columnWidth);
  return {
    column: Math.min(columnCount - 1, Math.max(0, rawColumn)),
    minutes: pxToMinutes(clientY - rect.top),
  };
}

export function hasMovedPastThreshold(dx: number, dy: number): boolean {
  return Math.abs(dx) >= DRAG_THRESHOLD_PX || Math.abs(dy) >= DRAG_THRESHOLD_PX;
}
