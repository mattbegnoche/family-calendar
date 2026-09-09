import { Skeleton } from "@/components/ui/skeleton";

const CARDS = 4;

/** Settings while the household, join requests and Google accounts load. */
export default function SettingsLoading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-10">
        {Array.from({ length: CARDS }, (_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-2/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
