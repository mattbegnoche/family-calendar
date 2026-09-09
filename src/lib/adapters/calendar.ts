import { localEventId, taskEventId } from "@/lib/calendar-ids";
import type { CalendarEvent, CalendarSource } from "@/lib/calendar/types";
import type { EventRecord } from "@/lib/events";
import type { Member } from "@/lib/household";
import type { TaskRecord } from "@/lib/tasks";

/**
 * Database rows → the calendar's event model. The only place outside the
 * calendar components that names its types, so the data layer never depends
 * on how the grid draws things.
 */

/** Default length for a task that has a time but no duration of its own. */
const TASK_BLOCK_MINUTES = 30;
const MS_PER_MINUTE = 60 * 1000;

export function toCalendarEvent(event: EventRecord): CalendarEvent {
  return {
    id: localEventId(event.id),
    title: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: event.startsAt,
    end: event.endsAt,
    allDay: event.allDay,
    calendarId: event.member.slug,
    color: event.member.color,
    source: "local",
    readOnly: false,
  };
}

/**
 * A task only reaches the grid when it has a `dueAt`; the caller is responsible
 * for filtering. Tasks carry no end time, so they render as a fixed block, and
 * they are edited from the tasks page rather than dragged around here.
 */
export function taskToCalendarEvent(task: TaskRecord): CalendarEvent | null {
  if (!task.dueAt) return null;
  const start = task.dueAt;
  const end = new Date(start.getTime() + TASK_BLOCK_MINUTES * MS_PER_MINUTE);

  return {
    id: taskEventId(task.id),
    title: task.icon ? `${task.icon} ${task.title}` : task.title,
    description: task.notes ?? undefined,
    start,
    end,
    allDay: false,
    calendarId: task.member.slug,
    color: task.member.color,
    source: "task",
    sourceLabel: "Tasks",
    readOnly: true,
  };
}

/** One toggle and one People column per household member. */
export function toCalendarSources(members: readonly Member[]): CalendarSource[] {
  return members.map((member) => ({
    id: member.slug,
    label: member.name,
    color: member.color,
  }));
}
