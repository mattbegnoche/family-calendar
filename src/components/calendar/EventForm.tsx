"use client";

import { useState, type FormEvent } from "react";

import { Dialog } from "@/components/calendar/Dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_EVENT_MINUTES } from "@/lib/calendar/time";
import type { CalendarEvent, CalendarSource, EventDraft } from "@/lib/calendar/types";

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
  readonly onSave: (draft: EventDraft) => void;
  readonly onDelete?: (eventId: string) => void;
}

/**
 * Only the fields that map to columns on the Event table. All-day inputs
 * carry a date only; they are anchored to local midnight on submit so the
 * event lands on the day picked rather than shifting across a zone.
 */
export function EventForm({ isOpen, onClose, event, seed, members, onSave, onDelete }: EventFormProps) {
  const isEditing = event !== null;

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
      calendarId,
      allDay,
      start: new Date(allDay ? `${toDateInputValue(start)}T00:00` : start),
      end: new Date(allDay ? `${toDateInputValue(end)}T00:00` : end),
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} label={isEditing ? "Edit event" : "New event"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{isEditing ? "Edit event" : "New event"}</h2>

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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-member">Who</Label>
          <select
            id="event-member"
            value={calendarId}
            onChange={(changed) => setCalendarId(changed.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
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
