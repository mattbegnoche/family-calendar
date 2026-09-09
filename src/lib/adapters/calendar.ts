import { localEventId, taskEventId } from "@/lib/calendar-ids";
import type { CalendarEvent, CalendarSource } from "@/lib/calendar/types";
import type { EventRecord } from "@/lib/events";
import type { Member } from "@/lib/household";
import { DEFAULT_TASK_ICON, isTaskIconKey } from "@/lib/task-icons";
import { taskDetailsOf } from "@/lib/task-item";
import { toTaskPriority } from "@/lib/task-priority";
import type { TaskOccurrence } from "@/lib/task-occurrences";
import type { TaskRecord } from "@/lib/tasks";

/**
 * Database rows → the calendar's event model. The only place outside the
 * calendar components that names its types, so the data layer never depends
 * on how the grid draws things.
 */

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
 * One occurrence of a task on the grid, drawn as long as the task's duration
 * says. Tasks are edited from the tasks page rather than dragged around here. A repeating task's occurrences share the task id with
 * the occurrence start appended, so each is its own card.
 */
export function taskOccurrenceToCalendarEvent(
  occurrence: TaskOccurrence<TaskRecord>,
): CalendarEvent {
  const { task, start } = occurrence;
  const suffix = occurrence.isRepeating ? `@${start.getTime()}` : "";
  const allDay = task.dueAllDay;
  const end = allDay ? start : new Date(start.getTime() + task.durationMinutes * MS_PER_MINUTE);

  return {
    id: taskEventId(`${task.id}${suffix}`),
    title: task.title,
    description: task.notes ?? undefined,
    start,
    end,
    allDay,
    calendarId: task.member.slug,
    color: task.member.color,
    source: "task",
    sourceLabel: "Tasks",
    readOnly: true,
    icon: isTaskIconKey(task.icon) ? task.icon : DEFAULT_TASK_ICON,
    task: {
      id: task.id,
      occurrenceStart: occurrence.isRepeating ? start : null,
      isDone: occurrence.isDone,
      editable: {
        id: task.id,
        title: task.title,
        icon: task.icon,
        notes: task.notes,
        priority: toTaskPriority(task.priority),
        memberId: task.memberId,
        details: taskDetailsOf(task),
      },
    },
  };
}

/** One toggle and one People column per household member. */
export function toCalendarSources(members: readonly Member[]): CalendarSource[] {
  return members.map((member) => ({
    id: member.slug,
    memberId: member.id,
    label: member.name,
    color: member.color,
  }));
}
