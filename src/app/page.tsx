import MyCalendar from "@/components/MyCalendar";

export default function Home() {
  return (
    // Full-bleed on a phone; an inset card once there is room for one. h-dvh with
    // internal scrolling is what stops the week grid collapsing.
    <main className="h-dvh w-full overflow-hidden p-0 sm:p-4 lg:p-6">
      <div className="h-full w-full overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
        <MyCalendar />
      </div>
    </main>
  );
}
