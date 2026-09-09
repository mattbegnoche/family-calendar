import { FamilyCalendar } from "@/components/FamilyCalendar";
import { ImportNotice } from "@/components/calendar/ImportNotice";
import {
  taskToCalendarEvent,
  toCalendarEvent,
  toCalendarSources,
} from "@/lib/adapters/calendar";
import { addDays, startOfWeek } from "@/lib/dates";
import { listEvents } from "@/lib/events";
import { importGoogleEvents } from "@/lib/google/import-events";
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

  const [events, scheduledTasks, google] = await Promise.all([
    listEvents(household.id, window),
    listScheduledTasks(household.id, window),
    importGoogleEvents(household, window),
  ]);

  const calendarEvents = [
    ...events.map(toCalendarEvent),
    // Tasks with a time share the grid with events, in the assignee's colour.
    ...scheduledTasks.map(taskToCalendarEvent).filter((task) => task !== null),
    // Google events are read-only and take the colour of the member they were
    // connected to.
    ...google.events,
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <ImportNotice problems={google.problems} />
      <div className="flex min-h-0 flex-1 flex-col">
        <FamilyCalendar
          initialEvents={calendarEvents}
          sources={toCalendarSources(household.members)}
        />
      </div>
    </div>
  );
}
