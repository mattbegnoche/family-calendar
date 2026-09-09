"use client";

import { CalendarDays, ExternalLink, MapPin } from "lucide-react";

import { Dialog } from "@/components/calendar/Dialog";
import { eventStyle } from "@/components/calendar/EventCard";
import { Button } from "@/components/ui/button";
import { readOnlyReason } from "@/lib/calendar-ids";
import { formatEventWhen } from "@/lib/calendar/format";
import type { CalendarEvent } from "@/lib/calendar/types";

export interface EventDetailsProps {
  readonly event: CalendarEvent | null;
  readonly onClose: () => void;
}

const SOURCE_NAMES: Record<CalendarEvent["source"], string> = {
  local: "Family calendar",
  task: "Tasks",
  google: "Google Calendar",
};

/**
 * What opens when a read-only event is clicked: everything the grid knows,
 * plus why it cannot be edited here and, for Google events, a link to where
 * it can.
 */
export function EventDetails({ event, onClose }: EventDetailsProps) {
  const reason = event ? readOnlyReason(event.id) : null;

  return (
    <Dialog isOpen={event !== null} onClose={onClose} label="Event details">
      {event ? (
        <>
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="event-solid mt-1.5 size-3 shrink-0 rounded-full"
              style={eventStyle(event)}
            />
            <h2 className="text-lg font-semibold leading-snug">{event.title}</h2>
          </div>

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <dd>{formatEventWhen(event)}</dd>
            </div>
            {event.location ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <dd>{event.location}</dd>
              </div>
            ) : null}
            {event.description ? (
              <dd className="whitespace-pre-wrap border-t pt-2 text-muted-foreground">
                {event.description}
              </dd>
            ) : null}
          </dl>

          <p className="text-xs text-muted-foreground">
            From {event.sourceLabel ? `${event.sourceLabel} · ` : ""}
            {SOURCE_NAMES[event.source]}.{reason ? ` ${reason}` : ""}
          </p>

          <div className="flex justify-end gap-2 border-t pt-4">
            {event.htmlLink ? (
              <Button
                variant="outline"
                render={<a href={event.htmlLink} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink />
                Open in {SOURCE_NAMES[event.source]}
              </Button>
            ) : null}
            <Button type="button" onClick={onClose} autoFocus>
              Close
            </Button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
