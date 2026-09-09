"use client";

import { Lock } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";

import { formatTime, formatTimeRange } from "@/lib/calendar/format";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

/** Hands the member colour to the .event-tint / .event-solid rules in globals.css. */
export function eventStyle(event: CalendarEvent, extra?: CSSProperties): CSSProperties {
  return { "--event-color": event.color, ...extra } as CSSProperties;
}

/** Enter or Space on a focused card opens it, the way a button would. */
function openOnKey(onOpen: () => void) {
  return (keyboard: KeyboardEvent<HTMLElement>) => {
    if (keyboard.key === "Enter" || keyboard.key === " ") {
      keyboard.preventDefault();
      onOpen();
    }
  };
}

/** Below this height there is no room for a second line of text. */
const TWO_LINE_MIN_PX = 40;

export interface TimedEventCardProps {
  readonly event: CalendarEvent;
  readonly top: number;
  readonly height: number;
  /** Percentages of the canvas width, so cards follow the columns on resize. */
  readonly leftPct: number;
  readonly widthPct: number;
  readonly onOpen: () => void;
  /** Drawn translucent: the ghost that follows the pointer during a drag. */
  readonly isPreview?: boolean;
  /** Drawn faded: the card whose ghost is being dragged elsewhere. */
  readonly isDragging?: boolean;
}

export function TimedEventCard({
  event,
  top,
  height,
  leftPct,
  widthPct,
  onOpen,
  isPreview = false,
  isDragging = false,
}: TimedEventCardProps) {
  const showsTime = height >= TWO_LINE_MIN_PX;

  return (
    <div
      role="button"
      tabIndex={isPreview ? -1 : 0}
      data-event-id={isPreview ? undefined : event.id}
      title={`${event.title} · ${formatTimeRange(event.start, event.end)}`}
      onKeyDown={openOnKey(onOpen)}
      className={cn(
        "event-tint absolute overflow-hidden rounded-md border border-l-[3px] px-1.5 py-0.5 text-left text-xs leading-tight text-foreground shadow-xs",
        "focus-visible:outline-2 focus-visible:outline-ring",
        event.readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isPreview && "pointer-events-none z-20 opacity-80 ring-2 ring-ring",
        isDragging && "opacity-40",
      )}
      style={eventStyle(event, {
        top,
        height: Math.max(height, 14),
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - 3px)`,
      })}
    >
      <div className="flex items-start gap-1">
        <span className="min-w-0 flex-1 truncate font-medium">{event.title}</span>
        {event.readOnly ? <Lock className="mt-0.5 size-3 shrink-0 opacity-60" aria-label="Read-only" /> : null}
      </div>
      {showsTime ? (
        <div className="truncate opacity-75">{formatTimeRange(event.start, event.end)}</div>
      ) : null}
      {event.readOnly || isPreview ? null : (
        <div
          data-resize-handle
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
        />
      )}
    </div>
  );
}

export interface EventChipProps {
  readonly event: CalendarEvent;
  readonly onOpen: () => void;
  /** Month cells show the start time before the title; all-day rows do not. */
  readonly showTime?: boolean;
  readonly isPreview?: boolean;
  readonly isDragging?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The compact one-line form: month cells, the all-day row, and agenda rows. */
export function EventChip({
  event,
  onOpen,
  showTime = false,
  isPreview = false,
  isDragging = false,
  className,
  style,
}: EventChipProps) {
  return (
    <div
      role="button"
      tabIndex={isPreview ? -1 : 0}
      data-event-id={isPreview ? undefined : event.id}
      title={event.title}
      onKeyDown={openOnKey(onOpen)}
      className={cn(
        "flex min-w-0 items-center gap-1 truncate rounded px-1.5 py-px text-left text-xs leading-5 text-foreground",
        event.allDay ? "event-solid" : "event-tint border border-l-[3px]",
        event.readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        "focus-visible:outline-2 focus-visible:outline-ring",
        isPreview && "pointer-events-none opacity-80 ring-2 ring-ring",
        isDragging && "opacity-40",
        className,
      )}
      style={eventStyle(event, style)}
    >
      {showTime && !event.allDay ? (
        <span className="shrink-0 opacity-75">{formatTime(event.start)}</span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{event.title}</span>
      {event.readOnly ? <Lock className="size-3 shrink-0 opacity-70" aria-label="Read-only" /> : null}
    </div>
  );
}
