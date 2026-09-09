import { Skeleton } from "@/components/ui/skeleton";

const HOUR_ROWS = 10;
const DAY_COLUMNS = 7;

/** The calendar's shape while the events, tasks and Google pulls are in flight. */
export default function CalendarLoading() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <div className="flex items-center gap-2 border-b px-3 py-2 sm:px-4">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="ml-2 h-6 w-48" />
        <Skeleton className="ml-auto h-8 w-28 rounded-md" />
        <Skeleton className="hidden h-8 w-64 rounded-md md:block" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-60 shrink-0 flex-col gap-4 border-r p-3 md:flex">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, index) => (
              <Skeleton key={index} className="size-6 rounded-full" />
            ))}
          </div>
          <Skeleton className="mt-2 h-4 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex border-b">
            <div className="w-14 shrink-0" />
            {Array.from({ length: DAY_COLUMNS }, (_, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1 border-l py-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="size-7 rounded-full" />
              </div>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex w-14 shrink-0 flex-col gap-10 pt-4 pr-2">
              {Array.from({ length: HOUR_ROWS }, (_, index) => (
                <Skeleton key={index} className="ml-auto h-3 w-8" />
              ))}
            </div>
            <div className="relative flex-1">
              {Array.from({ length: HOUR_ROWS }, (_, index) => (
                <div key={index} className="absolute inset-x-0 border-t border-border/70" style={{ top: index * 56 }} />
              ))}
              <Skeleton className="absolute left-[15%] top-[70px] h-14 w-[12%] rounded-md" />
              <Skeleton className="absolute left-[44%] top-[140px] h-24 w-[12%] rounded-md" />
              <Skeleton className="absolute left-[72%] top-[196px] h-10 w-[12%] rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
