import type { CalendarEvent } from "calendarkit-pro";

import type { EventRecord } from "@/lib/events";
import type { Member } from "@/lib/household";
import type { TaskRecord } from "@/lib/tasks";

/**
 * The only place outside a component that names CalendarKit's types. Keeping
 * the mapping here means replacing the calendar grid later touches this file
 * and the component, and nothing in the data layer.
 */

/** Default length for a task that has a time but no duration of its own. */
const TASK_BLOCK_MINUTES = 30;
const MS_PER_MINUTE = 60 * 1000;

export function toCalendarEvent(event: EventRecord): CalendarEvent {
  return {
    id: `event-${event.id}`,
    title: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: event.startsAt,
    end: event.endsAt,
    allDay: event.allDay,
    calendarId: event.member.slug,
    resourceId: event.member.slug,
    color: event.member.color,
  };
}

/**
 * A task only reaches the grid when it has a `dueAt`; the caller is responsible
 * for filtering. Tasks carry no end time, so they render as a fixed block.
 */
export function taskToCalendarEvent(task: TaskRecord): CalendarEvent | null {
  if (!task.dueAt) return null;
  const start = task.dueAt;
  const end = new Date(start.getTime() + TASK_BLOCK_MINUTES * MS_PER_MINUTE);

  return {
    id: `task-${task.id}`,
    title: task.icon ? `${task.icon} ${task.title}` : task.title,
    description: task.notes ?? undefined,
    start,
    end,
    allDay: false,
    calendarId: task.member.slug,
    resourceId: task.member.slug,
    color: task.member.color,
  };
}

/** CalendarKit's toggleable calendar list, one entry per household member. */
export function toCalendarList(members: readonly Member[]) {
  return members.map((member) => ({
    id: member.slug,
    label: member.name,
    color: member.color,
  }));
}

export function toResources(members: readonly Member[]) {
  return members.map((member) => ({
    id: member.slug,
    label: member.name,
    color: member.color,
  }));
}
