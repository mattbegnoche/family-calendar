"use client";

import { useEffect, useRef } from "react";

import { FALLBACK_TIME_ZONE, allTimeZones, guessTimeZone } from "@/lib/time-zones";
import { cn } from "@/lib/utils";

export interface TimeZoneSelectProps {
  id: string;
  name: string;
  /**
   * The household's saved zone. Omit when creating a family: the field then
   * corrects itself to the browser's own zone once mounted.
   */
  defaultValue?: string;
  className?: string;
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/**
 * The ~420 IANA zones as a native select.
 *
 * The browser's own zone is not knowable while rendering on the server, so the
 * field is uncontrolled: it renders with a stable fallback both sides agree on,
 * then an effect writes the guess straight to the DOM node. Deliberately not
 * setState — nothing else on the page reads the value, so a second render pass
 * would buy nothing, and seeding state from Intl during render would trip a
 * hydration mismatch instead.
 */
export function TimeZoneSelect({
  id,
  name,
  defaultValue,
  className,
}: TimeZoneSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (defaultValue) return; // an existing household already has an answer
    const select = selectRef.current;
    if (select) select.value = guessTimeZone();
  }, [defaultValue]);

  return (
    <select
      id={id}
      name={name}
      ref={selectRef}
      defaultValue={defaultValue ?? FALLBACK_TIME_ZONE}
      className={cn(SELECT_CLASS, className)}
    >
      {allTimeZones().map((zone) => (
        <option key={zone} value={zone}>
          {zone.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
