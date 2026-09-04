"use client";

import { useEffect, useState } from "react";
import type { CalendarEvent } from "calendarkit-pro";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalendarSource } from "@/components/MyCalendar";

const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_DURATION_MINUTES = 60;

/** datetime-local wants local wall-clock "YYYY-MM-DDTHH:mm", not an ISO UTC string. */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function toDateInputValue(date: Date): string {
  return toLocalInputValue(date).slice(0, 10);
}

export interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  initialDate?: Date;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: (eventId: string) => void;
  members: readonly CalendarSource[];
}

/**
 * Replaces CalendarKit's built-in modal via `renderEventForm`.
 *
 * The built-in one carries Reminders, Guests and Attachments, none of which
 * this app stores. Rather than hiding them with CSS — a brittle override on
 * third-party markup — this renders only the fields that map to columns on the
 * Event table.
 */
export function EventForm({
  isOpen,
  onClose,
  event,
  initialDate,
  onSave,
  onDelete,
  members,
}: EventFormProps) {
  const isEditing = Boolean(event?.id);

  const [title, setTitle] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // Reset whenever the modal opens for a different event.
  useEffect(() => {
    if (!isOpen) return;
    const startsAt = event?.start ?? initialDate ?? new Date();
    const endsAt =
      event?.end ?? new Date(startsAt.getTime() + DEFAULT_DURATION_MINUTES * MS_PER_MINUTE);

    setTitle(event?.title ?? "");
    setCalendarId(event?.calendarId ?? members[0]?.id ?? "");
    setAllDay(event?.allDay ?? false);
    setStart(toLocalInputValue(startsAt));
    setEnd(toLocalInputValue(endsAt));
    setLocation(typeof event?.location === "string" ? event.location : "");
    setDescription(event?.description ?? "");
  }, [isOpen, event, initialDate, members]);

  if (!isOpen) return null;

  const handleSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    // All-day inputs carry a date only; anchor them to local midnight so they
    // land on the day the user picked rather than shifting across a zone.
    const startsAt = new Date(allDay ? `${start.slice(0, 10)}T00:00` : start);
    const endsAt = new Date(allDay ? `${end.slice(0, 10)}T00:00` : end);

    onSave({
      title: title.trim(),
      calendarId,
      allDay,
      start: startsAt,
      end: endsAt,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit event" : "New event"}
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold">
          {isEditing ? "Edit event" : "New event"}
        </h2>

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
              value={allDay ? toDateInputValue(new Date(start)) : start}
              onChange={(changed) => setStart(changed.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-end">Ends</Label>
            <Input
              id="event-end"
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? toDateInputValue(new Date(end)) : end}
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
          {isEditing && onDelete && event?.id ? (
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
    </div>
  );
}
