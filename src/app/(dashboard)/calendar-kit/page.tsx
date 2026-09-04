import MyCalendar from "@/components/MyCalendar";
import { startOfWeek } from "@/lib/dates";
import { buildSampleWeek } from "@/lib/sample-events";

export default function CalendarKitPage() {
  // Placeholder data. This is the seam where locally-stored events will come
  // from once they are persisted — swap this one call for the database read.
  const events = buildSampleWeek(startOfWeek(new Date()));

  return (
    <div className="h-full w-full overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <MyCalendar initialEvents={events} />
    </div>
  );
}
