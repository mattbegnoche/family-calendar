import { describe, expect, it } from "vitest";

import { layoutDayEvents } from "@/lib/calendar/layout";
import { TEST_DAY, allDayEvent, at, makeEvent } from "../helpers/calendar-events";

function timed(id: string, startHour: number, endHour: number) {
  return makeEvent({ id, start: at(10, startHour), end: at(10, endHour) });
}

function placementOf(placements: ReturnType<typeof layoutDayEvents>, id: string) {
  const placement = placements.find((candidate) => candidate.event.id === id);
  if (!placement) throw new Error(`No placement for ${id}`);
  return placement;
}

describe("layoutDayEvents", () => {
  it("gives non-overlapping events the full width", () => {
    const placements = layoutDayEvents([timed("a", 9, 10), timed("b", 11, 12)], TEST_DAY);

    expect(placements.map((placement) => placement.columns)).toEqual([1, 1]);
    expect(placements.map((placement) => placement.column)).toEqual([0, 0]);
  });

  it("splits overlapping events into side-by-side columns", () => {
    const placements = layoutDayEvents([timed("a", 9, 11), timed("b", 10, 12)], TEST_DAY);

    expect(placementOf(placements, "a")).toMatchObject({ column: 0, columns: 2 });
    expect(placementOf(placements, "b")).toMatchObject({ column: 1, columns: 2 });
  });

  it("starts a new cluster once nothing is still running", () => {
    const placements = layoutDayEvents(
      [timed("a", 9, 10), timed("b", 9, 10), timed("c", 10, 11)],
      TEST_DAY,
    );

    expect(placementOf(placements, "a").columns).toBe(2);
    expect(placementOf(placements, "b").columns).toBe(2);
    expect(placementOf(placements, "c")).toMatchObject({ column: 0, columns: 1 });
  });

  it("reuses a freed column inside a chain of overlaps", () => {
    const placements = layoutDayEvents(
      [timed("a", 9, 11), timed("b", 10, 12), timed("c", 11, 13)],
      TEST_DAY,
    );

    // c overlaps b but not a, so it takes a's column; all three share one cluster.
    expect(placementOf(placements, "a")).toMatchObject({ column: 0, columns: 2 });
    expect(placementOf(placements, "b")).toMatchObject({ column: 1, columns: 2 });
    expect(placementOf(placements, "c")).toMatchObject({ column: 0, columns: 2 });
  });

  it("orders events by start, then longest first", () => {
    const placements = layoutDayEvents([timed("short", 9, 10), timed("long", 9, 12)], TEST_DAY);

    expect(placements.map((placement) => placement.event.id)).toEqual(["long", "short"]);
  });

  it("ignores all-day events and events on other days", () => {
    const placements = layoutDayEvents(
      [allDayEvent("holiday", 10), makeEvent({ id: "tomorrow", start: at(11, 9), end: at(11, 10) })],
      TEST_DAY,
    );

    expect(placements).toEqual([]);
  });
});
