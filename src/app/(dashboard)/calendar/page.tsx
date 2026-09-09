import { FamilyCalendar } from "@/components/FamilyCalendar";
import { ImportNotice } from "@/components/calendar/ImportNotice";
import {
  taskOccurrenceToCalendarEvent,
  toCalendarEvent,
  toCalendarSources,
} from "@/lib/adapters/calendar";
import { addDays, startOfWeek } from "@/lib/dates";
import { listEvents } from "@/lib/events";
import { listWritableConnections } from "@/lib/google/connections";
import { importGoogleEvents } from "@/lib/google/import-events";
import { requireHousehold } from "@/lib/household";
import { taskOccurrencesInWindow } from "@/lib/task-occurrences";
import { listCompletions, listTasksForWindow } from "@/lib/tasks";

/** Wide enough that paging a few weeks either way needs no refetch. */
const DAYS_BEFORE = 30;
const DAYS_AFTER = 90;

export default async function CalendarPage() {
  const { household, userId } = await requireHousehold();

  const anchor = startOfWeek(new Date());
  const window = {
    from: addDays(anchor, -DAYS_BEFORE),
    to: addDays(anchor, DAYS_AFTER),
  };

  const [events, datedTasks, completions, google, googleCalendars] = await Promise.all([
    listEvents(household.id, window),
    listTasksForWindow(household.id, window),
    listCompletions(household.id, window),
    importGoogleEvents(household, window, userId),
    // Where this person may create Google events: their own connected calendars.
    listWritableConnections(household.id, userId).catch((error: unknown) => {
      console.error("[google-calendar] could not list writable calendars", error);
      return [];
    }),
  ]);

  // Repeating tasks are expanded here, in the household's zone, so "every
  // morning at seven" lands on seven o'clock whichever device is looking.
  const taskOccurrences = taskOccurrencesInWindow(datedTasks, completions, window, household.timeZone);

  const calendarEvents = [
    ...events.map(toCalendarEvent),
    // Tasks with a date share the grid with events, in the assignee's colour.
    ...taskOccurrences.map(taskOccurrenceToCalendarEvent),
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
          googleCalendars={googleCalendars}
        />
      </div>
    </div>
  );
}
