import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS = 3;
const CARDS_PER_COLUMN = 3;

/** The board's shape while tasks load. */
export default function TasksLoading() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Skeleton className="mr-auto h-6 w-16" />
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Skeleton className="h-8 min-w-40 flex-1 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-2.5 md:grid-cols-3">
        {Array.from({ length: COLUMNS }, (_, column) => (
          <div key={column} className="flex flex-col rounded-2xl border bg-card">
            <div className="flex items-baseline gap-2 border-b px-3 py-2.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="flex flex-col gap-2 p-2.5">
              {Array.from({ length: CARDS_PER_COLUMN - (column % 2) }, (_, card) => (
                <Skeleton key={card} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
