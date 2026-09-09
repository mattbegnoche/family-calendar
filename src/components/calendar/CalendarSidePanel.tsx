"use client";

import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { SourceToggles } from "@/components/calendar/SourceToggles";
import type { CalendarSource } from "@/lib/calendar/types";

export interface CalendarSidePanelProps {
  readonly focusDate: Date;
  readonly today: Date | null;
  readonly eventDays: ReadonlySet<string>;
  readonly sources: readonly CalendarSource[];
  readonly hiddenIds: ReadonlySet<string>;
  readonly onSelectDate: (date: Date) => void;
  readonly onToggleSource: (id: string, visible: boolean) => void;
}

/** The date picker and the calendars list beside the grid. */
export function CalendarSidePanel({
  focusDate,
  today,
  eventDays,
  sources,
  hiddenIds,
  onSelectDate,
  onToggleSource,
}: CalendarSidePanelProps) {
  return (
    <div className="flex flex-col gap-5 p-3">
      <MiniCalendar
        focusDate={focusDate}
        today={today}
        eventDays={eventDays}
        onSelectDate={onSelectDate}
      />
      <div className="flex flex-col gap-1.5">
        <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Calendars
        </h3>
        <SourceToggles sources={sources} hiddenIds={hiddenIds} onToggle={onToggleSource} />
      </div>
    </div>
  );
}
