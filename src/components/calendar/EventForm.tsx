"use client";

import { useState, type FormEvent } from "react";

import { Dialog } from "@/components/Dialog";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_EVENT_MINUTES } from "@/lib/calendar/time";
import { durationBetween } from "@/lib/task-duration";
import type { CalendarEvent, CalendarSource, EventDraft } from "@/lib/calendar/types";
import type { WritableCalendarOption } from "@/lib/google/types";
import { cn } from "@/lib/utils";

const MS_PER_MINUTE = 60 * 1000;

/** datetime-local wants local wall-clock "YYYY-MM-DDTHH:mm", not an ISO UTC string. */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

/** Where a new event starts out: what was clicked or dragged on the grid. */
export interface EventSeed {
  readonly start: Date;
  readonly end: Date;
  readonly allDay: boolean;
  readonly calendarId?: string;
}

export interface EventFormProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** The event being edited, or null when creating one. */
  readonly event: CalendarEvent | null;
  readonly seed: EventSeed | null;
  readonly members: readonly CalendarSource[];
  /** Google calendars the signed-in user may create events in; empty hides the choice. */
  readonly googleCalendars?: readonly WritableCalendarOption[];
  readonly onSave: (draft: EventDraft) => void;
  readonly onDelete?: (eventId: string) => void;
}

/** The "Save to" value for the family's own calendar. */
const FAMILY_CALENDAR = "family";

/**
 * Only the fields that map to columns on the Event table. All-day inputs
 * carry a date only; they are anchored to local midnight on submit so the
 * event lands on the day picked rather than shifting across a zone.
 */
type ItemKind = "event" | "task";

const KIND_LABELS: Record<ItemKind, string> = { event: "Event", task: "Task" };

export function EventForm({
  isOpen,
  onClose,
  event,
  seed,
  members,
  googleCalendars = [],
  onSave,
  onDelete,
}: EventFormProps) {
  const isEditing = event !== null;
  // Where a NEW event is written: the family's own calendar, or one of the
  // caller's connected Google calendars. Its column then follows that calendar.
  const [destination, setDestination] = useState(FAMILY_CALENDAR);
  const googleDestination = googleCalendars.find((option) => option.connectionId === destination);
  // A Google event belongs to the calendar it was imported from — or is being
  // created in; its column follows that calendar's member and cannot be set here.
  const isGoogleEvent = event?.source === "google" || googleDestination !== undefined;
  // Only a new item can be a task: existing tasks are edited from the tasks page.
  const [kind, setKind] = useState<ItemKind>("event");

  // Initial values come straight from props: the parent mounts a fresh form
  // each time the editor opens, so there is nothing to reset later.
  const startsAt = event?.start ?? seed?.start ?? new Date();
  const endsAt =
    event?.end ?? seed?.end ?? new Date(startsAt.getTime() + DEFAULT_EVENT_MINUTES * MS_PER_MINUTE);

  const [title, setTitle] = useState(event?.title ?? "");
  const [calendarId, setCalendarId] = useState(
    event?.calendarId ?? seed?.calendarId ?? members[0]?.id ?? "",
  );
  const [allDay, setAllDay] = useState(event?.allDay ?? seed?.allDay ?? false);
  const [start, setStart] = useState(() => toLocalInputValue(startsAt));
  const [end, setEnd] = useState(() => toLocalInputValue(endsAt));
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");

  const handleSubmit = (submit: FormEvent) => {
    submit.preventDefault();
    onSave({
      title: title.trim(),
      calendarId: googleDestination?.memberSlug ?? calendarId,
      allDay,
      ...(googleDestination && { googleConnectionId: googleDestination.connectionId }),
      start: new Date(allDay ? `${toDateInputValue(start)}T00:00` : start),
      end: new Date(allDay ? `${toDateInputValue(end)}T00:00` : end),
      // Sent as strings, blank included, so clearing a field actually clears it.
      location: location.trim(),
      description: description.trim(),
    });
  };

  const kindSwitch = isEditing ? null : (
    <div role="tablist" aria-label="What to add" className="flex rounded-lg bg-muted p-0.5">
      {(Object.keys(KIND_LABELS) as ItemKind[]).map((candidate) => (
        <button
          key={candidate}
          type="button"
          role="tab"
          aria-selected={candidate === kind}
          onClick={() => setKind(candidate)}
          className={cn(
            "flex-1 rounded-md px-3 py-1 text-sm font-medium transition-colors",
            candidate === kind ? "bg-background shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {KIND_LABELS[candidate]}
        </button>
      ))}
    </div>
  );

  if (!isEditing && kind === "task") {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} label="New task">
        <h2 className="text-lg font-semibold">New task</h2>
        {kindSwitch}
        <TaskForm
          members={members.map((member) => ({ id: member.memberId, name: member.label, color: member.color }))}
          task={null}
          seed={{
            start: seed?.start ?? new Date(),
            allDay: seed?.allDay ?? false,
            memberId: members.find((member) => member.id === seed?.calendarId)?.memberId,
            // A range dragged out on the grid is how long the task takes.
            durationMinutes: seed && !seed.allDay ? durationBetween(seed.start, seed.end) : undefined,
          }}
          onSaved={onClose}
          onCancel={onClose}
        />
      </Dialog>
    );
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} label={isEditing ? "Edit event" : "New event"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{isEditing ? "Edit event" : "New event"}</h2>
        {kindSwitch}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-title">Title</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(changed) => setTitle(changed.target.value)}
            placeholder="Soccer practice"
            required
            autoFocus
          />
        </div>

        {!isEditing && googleCalendars.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-destination">Save to</Label>
            <select
              id="event-destination"
              value={destination}
              onChange={(changed) => setDestination(changed.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value={FAMILY_CALENDAR}>Family calendar</option>
              {googleCalendars.map((option) => (
                <option key={option.connectionId} value={option.connectionId}>
                  {option.name} · {option.accountEmail}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-member">Who</Label>
          <select
            id="event-member"
            value={googleDestination?.memberSlug ?? calendarId}
            onChange={(changed) => setCalendarId(changed.target.value)}
            disabled={isGoogleEvent}
            className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-60"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
          {isGoogleEvent ? (
            <p className="text-xs text-muted-foreground">
              {googleDestination
                ? `Saved to ${googleDestination.name}; it goes in that calendar's column.`
                : `From ${event?.sourceLabel ?? "Google Calendar"}; it stays in that calendar's column.`}
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(changed) => setAllDay(changed.target.checked)}
            className="size-4"
          />
          All day
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-start">Starts</Label>
            <Input
              id="event-start"
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? toDateInputValue(start) : start}
              onChange={(changed) => setStart(changed.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-end">Ends</Label>
            <Input
              id="event-end"
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? toDateInputValue(end) : end}
              onChange={(changed) => setEnd(changed.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            value={location}
            onChange={(changed) => setLocation(changed.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-notes">Notes</Label>
          <textarea
            id="event-notes"
            value={description}
            onChange={(changed) => setDescription(changed.target.value)}
            rows={3}
            placeholder="Optional"
            className="rounded-md border bg-background p-2 text-sm"
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          {isEditing && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => onDelete(event.id)}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
