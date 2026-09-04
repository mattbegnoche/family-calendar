import MyCalendar from "@/components/MyCalendar";
import { importGoogleEvents } from "@/lib/google/import-events";
import { requireUser } from "@/lib/sessions";

export default async function CalendarKitPage() {
  const user = await requireUser();
  const { events, error } = await importGoogleEvents(user.id);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      {error ? (
        <p className="shrink-0 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {error}
        </p>
      ) : null}
      <div className="min-h-0 flex-1">
        <MyCalendar initialEvents={events} />
      </div>
    </div>
  );
}
