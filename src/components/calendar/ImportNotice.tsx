import { TriangleAlert } from "lucide-react";

export interface ImportNoticeProps {
  /** One line per calendar that could not be read this time. */
  readonly problems: readonly string[];
}

/** Shown above the grid when a connected Google calendar failed to load; the rest still render. */
export function ImportNotice({ problems }: ImportNoticeProps) {
  if (problems.length === 0) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-start gap-2 border-b bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-300"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">Some Google calendars could not be loaded.</span>
        {problems.map((problem) => (
          <span key={problem} className="text-xs opacity-90">
            {problem}
          </span>
        ))}
      </div>
    </div>
  );
}
