import type { CalendarEvent } from "@/lib/calendar/types";
import { sliceOnDay, type DaySlice } from "@/lib/calendar/time";

/**
 * Side-by-side layout for timed events in the day and week views.
 *
 * Events that overlap in time share the column width equally, Google
 * Calendar style. A "cluster" is a run of events where each overlaps the one
 * before it; every event in a cluster is drawn at 1/n of the width, where n
 * is the most that were ever stacked at once within that cluster.
 */

export interface TimedPlacement extends DaySlice {
  readonly event: CalendarEvent;
  /** Zero-based column within the cluster. */
  readonly column: number;
  /** How many columns the cluster needs; the card is 1/columns wide. */
  readonly columns: number;
}

interface Slice extends DaySlice {
  readonly event: CalendarEvent;
}

interface PendingPlacement extends Slice {
  readonly column: number;
}

interface Cluster {
  readonly placements: readonly PendingPlacement[];
  /** End minute of the latest event in each column so far. */
  readonly columnEnds: readonly number[];
  /** The latest end in the whole cluster: the point after which a new cluster starts. */
  readonly end: number;
}

const EMPTY_CLUSTER: Cluster = { placements: [], columnEnds: [], end: -1 };

function slicesOn(events: readonly CalendarEvent[], day: Date): Slice[] {
  return events
    .filter((event) => !event.allDay)
    .flatMap((event) => {
      const slice = sliceOnDay(event.start, event.end, day);
      return slice ? [{ event, ...slice }] : [];
    })
    .sort(
      (a, b) =>
        a.startMinutes - b.startMinutes ||
        b.endMinutes - a.endMinutes ||
        a.event.id.localeCompare(b.event.id),
    );
}

function placeInCluster(cluster: Cluster, slice: Slice): Cluster {
  const freeColumn = cluster.columnEnds.findIndex((end) => end <= slice.startMinutes);
  const column = freeColumn === -1 ? cluster.columnEnds.length : freeColumn;
  const columnEnds = [...cluster.columnEnds];
  columnEnds[column] = slice.endMinutes;
  return {
    placements: [...cluster.placements, { ...slice, column }],
    columnEnds,
    end: Math.max(cluster.end, slice.endMinutes),
  };
}

function finish(cluster: Cluster): TimedPlacement[] {
  const columns = cluster.columnEnds.length;
  return cluster.placements.map((placement) => ({ ...placement, columns }));
}

/** Timed events touching `day`, arranged into columns wherever they overlap. */
export function layoutDayEvents(
  events: readonly CalendarEvent[],
  day: Date,
): TimedPlacement[] {
  const { done, current } = slicesOn(events, day).reduce<{
    done: TimedPlacement[];
    current: Cluster;
  }>(
    (state, slice) => {
      const startsNewCluster =
        state.current.placements.length > 0 && slice.startMinutes >= state.current.end;
      return startsNewCluster
        ? { done: [...state.done, ...finish(state.current)], current: placeInCluster(EMPTY_CLUSTER, slice) }
        : { done: state.done, current: placeInCluster(state.current, slice) };
    },
    { done: [], current: EMPTY_CLUSTER },
  );

  return [...done, ...finish(current)];
}
