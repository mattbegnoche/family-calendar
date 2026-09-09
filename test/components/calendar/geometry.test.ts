import { describe, expect, it } from "vitest";

import {
  HOUR_HEIGHT_PX,
  hasMovedPastThreshold,
  locateInGrid,
  minutesToPx,
  pxToMinutes,
} from "@/components/calendar/geometry";

describe("minutes and pixels", () => {
  it("round-trip through the hour height", () => {
    expect(minutesToPx(60)).toBe(HOUR_HEIGHT_PX);
    expect(pxToMinutes(HOUR_HEIGHT_PX * 1.5)).toBe(90);
  });

  it("clamps pixels outside the grid to the day's edges", () => {
    expect(pxToMinutes(-10)).toBe(0);
    expect(pxToMinutes(HOUR_HEIGHT_PX * 30)).toBe(1440);
  });
});

describe("locateInGrid", () => {
  const rect = { left: 100, top: 50, width: 700 };

  it("picks the column and minute under the pointer", () => {
    expect(locateInGrid(rect, 7, 100 + 250, 50 + HOUR_HEIGHT_PX * 9.5)).toEqual({
      column: 2,
      minutes: 570,
    });
  });

  it("clamps a pointer outside the grid to the nearest column", () => {
    expect(locateInGrid(rect, 7, 20, 50).column).toBe(0);
    expect(locateInGrid(rect, 7, 2000, 50).column).toBe(6);
  });
});

describe("hasMovedPastThreshold", () => {
  it("treats a tiny wobble as a click", () => {
    expect(hasMovedPastThreshold(1, 2)).toBe(false);
    expect(hasMovedPastThreshold(0, 5)).toBe(true);
  });
});
