import MyCalendar from "@/components/MyCalendar";

export default function CalendarKitPage() {
  return (
    <div className="h-full w-full overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <MyCalendar />
    </div>
  );
}
