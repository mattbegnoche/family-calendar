"use client";

import { Check, CalendarDays, ExternalLink, MapPin, Pencil, RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";

import { toggleTaskOccurrence } from "@/app/actions/tasks";
import { Dialog } from "@/components/Dialog";
import { TaskForm, type TaskFormMember } from "@/components/tasks/TaskForm";
import { TaskIcon } from "@/components/tasks/TaskIcon";
import { eventStyle } from "@/components/calendar/EventCard";
import { Button } from "@/components/ui/button";
import { readOnlyReason } from "@/lib/calendar-ids";
import { formatEventWhen } from "@/lib/calendar/format";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

export interface EventDetailsProps {
  readonly event: CalendarEvent | null;
  /** Household members, for the task editor's Who field. */
  readonly members: readonly TaskFormMember[];
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
export function EventDetails({ event, members, onClose }: EventDetailsProps) {
  const reason = event ? (event.readOnlyNote ?? readOnlyReason(event.id)) : null;
  const [isToggling, startToggle] = useTransition();
  // Remounted per event by the parent (key={event.id}), so this resets each time.
  const [isEditing, setIsEditing] = useState(false);

  // The page re-renders with the fresh state after the action, so closing is
  // all that is left to do here.
  const toggleDone = () => {
    const task = event?.task;
    if (!task) return;
    startToggle(async () => {
      await toggleTaskOccurrence(
        task.id,
        task.occurrenceStart ? task.occurrenceStart.getTime() : null,
        !task.isDone,
      );
      onClose();
    });
  };

  if (event?.task && isEditing) {
    return (
      <Dialog isOpen onClose={onClose} label="Edit task">
        <h2 className="text-lg font-semibold">Edit task</h2>
        {/* Saving revalidates the calendar; closing is all that is left. */}
        <TaskForm
          members={members}
          task={event.task.editable}
          seed={null}
          onSaved={onClose}
          onCancel={() => setIsEditing(false)}
        />
      </Dialog>
    );
  }

  return (
    <Dialog isOpen={event !== null} onClose={onClose} label="Event details">
      {event ? (
        <>
          <div className="flex items-start gap-3">
            {event.icon ? (
              <TaskIcon iconKey={event.icon} className="mt-1 size-5 shrink-0" />
            ) : (
              <span
                aria-hidden
                className="event-solid mt-1.5 size-3 shrink-0 rounded-full"
                style={eventStyle(event)}
              />
            )}
            <h2 className={cn("text-lg font-semibold leading-snug", event.task?.isDone && "line-through opacity-70")}>
              {event.title}
            </h2>
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
            {event.task ? (
              <>
                <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil />
                  Edit task
                </Button>
                <Button type="button" variant="outline" onClick={toggleDone} disabled={isToggling}>
                  {event.task.isDone ? <RotateCcw /> : <Check />}
                  {event.task.isDone ? "Reopen" : "Mark done"}
                </Button>
              </>
            ) : null}
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
