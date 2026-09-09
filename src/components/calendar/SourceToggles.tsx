"use client";

import { Check } from "lucide-react";

import type { CalendarSource } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export interface SourceTogglesProps {
  readonly sources: readonly CalendarSource[];
  readonly hiddenIds: ReadonlySet<string>;
  readonly onToggle: (id: string, visible: boolean) => void;
}

/** The calendars list: one row per member, ticked when shown, in the member's colour. */
export function SourceToggles({ sources, hiddenIds, onToggle }: SourceTogglesProps) {
  return (
    <ul className="flex flex-col gap-0.5">
      {sources.map((source) => {
        const isVisible = !hiddenIds.has(source.id);
        return (
          <li key={source.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={isVisible}
              onClick={() => onToggle(source.id, !isVisible)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted",
                !isVisible && "text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className="flex size-4 shrink-0 items-center justify-center rounded"
                style={{
                  backgroundColor: isVisible ? source.color : "transparent",
                  boxShadow: `inset 0 0 0 1.5px ${source.color}`,
                }}
              >
                {isVisible ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
              </span>
              <span className="truncate">{source.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
