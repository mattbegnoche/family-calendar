"use client";

import { ChevronLeft, ChevronRight, PanelLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CALENDAR_VIEWS,
  CALENDAR_VIEW_LABELS,
  isCalendarView,
  type CalendarView,
} from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export interface CalendarHeaderProps {
  readonly title: string;
  readonly view: CalendarView;
  readonly onViewChange: (view: CalendarView) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
  readonly onNewEvent: () => void;
  readonly isPanelOpen: boolean;
  readonly onTogglePanel: () => void;
}

const SELECT_CLASS =
  "h-8 rounded-md border border-border bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CalendarHeader({
  title,
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onNewEvent,
  isPanelOpen,
  onTogglePanel,
}: CalendarHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onTogglePanel}
          aria-pressed={isPanelOpen}
          aria-label="Show date picker and calendars"
        >
          <PanelLeft />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onPrevious} aria-label="Previous">
          <ChevronLeft />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onNext} aria-label="Next">
          <ChevronRight />
        </Button>
      </div>

      <h2 className="min-w-0 flex-1 truncate text-base font-semibold sm:text-lg">{title}</h2>

      {/* Segmented buttons where there is room; a native select on phones. */}
      <div role="group" aria-label="Calendar view" className="hidden rounded-md border p-0.5 md:flex">
        {CALENDAR_VIEWS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => onViewChange(candidate)}
            aria-pressed={candidate === view}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
              candidate === view
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {CALENDAR_VIEW_LABELS[candidate]}
          </button>
        ))}
      </div>
      <select
        aria-label="Calendar view"
        value={view}
        onChange={(change) => {
          if (isCalendarView(change.target.value)) onViewChange(change.target.value);
        }}
        className={cn(SELECT_CLASS, "md:hidden")}
      >
        {CALENDAR_VIEWS.map((candidate) => (
          <option key={candidate} value={candidate}>
            {CALENDAR_VIEW_LABELS[candidate]}
          </option>
        ))}
      </select>

      <Button type="button" size="sm" onClick={onNewEvent}>
        <Plus />
        <span className="hidden sm:inline">New event</span>
      </Button>
    </div>
  );
}
