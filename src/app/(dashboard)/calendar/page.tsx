import MyCalendar from "@/components/MyCalendar";
import {
  toCalendarEvent,
  toCalendarList,
  toResources,
  taskToCalendarEvent,
} from "@/lib/adapters/calendar-kit";
import { addDays, startOfWeek } from "@/lib/dates";
import { listEvents } from "@/lib/events";
import { requireHousehold } from "@/lib/household";
import { listScheduledTasks } from "@/lib/tasks";

/** Wide enough that paging a few weeks either way needs no refetch. */
const DAYS_BEFORE = 30;
const DAYS_AFTER = 90;

export default async function CalendarPage() {
  const { household } = await requireHousehold();

  const anchor = startOfWeek(new Date());
  const window = {
    from: addDays(anchor, -DAYS_BEFORE),
    to: addDays(anchor, DAYS_AFTER),
  };

  const [events, scheduledTasks] = await Promise.all([
    listEvents(household.id, window),
    listScheduledTasks(household.id, window),
  ]);

  const calendarEvents = [
    ...events.map(toCalendarEvent),
    // Tasks with a time share the grid with events, in the assignee's colour.
    ...scheduledTasks.map(taskToCalendarEvent).filter((task) => task !== null),
  ];

  return (
    <div className="h-full w-full overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <MyCalendar
        initialEvents={calendarEvents}
        calendars={toCalendarList(household.members)}
        resources={toResources(household.members)}
      />
    </div>
  );
}
