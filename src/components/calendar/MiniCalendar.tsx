"use client";

import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { chunkWeeks, monthGridDays } from "@/lib/calendar/month-grid";
import { cn } from "@/lib/utils";

export interface MiniCalendarProps {
  /** The date the main calendar is focused on. */
  readonly focusDate: Date;
  readonly today: Date | null;
  /** "yyyy-MM-dd" keys of days that have at least one event: drawn with a dot. */
  readonly eventDays: ReadonlySet<string>;
  readonly onSelectDate: (date: Date) => void;
}

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * The small month grid in the side panel: a date picker for the main view.
 * Browses months on its own, but snaps back to the focused date's month
 * whenever the main calendar moves, so the two never silently disagree.
 */
export function MiniCalendar({ focusDate, today, eventDays, onSelectDate }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(focusDate));
  // Adjusting state when a prop changes, done during render as React documents.
  const [followedFocus, setFollowedFocus] = useState(focusDate);
  if (followedFocus !== focusDate) {
    setFollowedFocus(focusDate);
    setViewMonth(startOfMonth(focusDate));
  }

  const weeks = chunkWeeks(monthGridDays(viewMonth));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{format(viewMonth, "MMMM yyyy")}</span>
        <div className="flex">
          <button
            type="button"
            onClick={() => setViewMonth((month) => addMonths(month, -1))}
            aria-label="Previous month"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMonth((month) => addMonths(month, 1))}
            aria-label="Next month"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span key={index} className="py-0.5">
            {initial}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {weeks.flat().map((day) => {
          const isFocused = isSameDay(day, focusDate);
          const isToday = today !== null && isSameDay(day, today);
          const hasEvents = eventDays.has(dayKey(day));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-label={format(day, "EEEE, MMMM d, yyyy")}
              aria-pressed={isFocused}
              className={cn(
                "relative mx-auto flex size-7 items-center justify-center rounded-full text-xs transition-colors hover:bg-muted",
                !isSameMonth(day, viewMonth) && "text-muted-foreground/60",
                isToday && !isFocused && "font-semibold text-primary",
                isFocused && "bg-primary font-semibold text-primary-foreground hover:bg-primary",
              )}
            >
              {day.getDate()}
              {hasEvents ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-0.5 size-1 rounded-full",
                    isFocused ? "bg-primary-foreground" : "bg-primary",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
