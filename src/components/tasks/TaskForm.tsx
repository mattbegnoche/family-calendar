"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";

import { saveTaskAction } from "@/app/actions/tasks";
import { IDLE_SAVE_STATE } from "@/lib/action-state";
import { FormError } from "@/components/onboarding/FormError";
import { TaskIconPicker } from "@/components/tasks/TaskIconPicker";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_TASK_DURATION_MINUTES,
  durationChoices,
  formatDuration,
} from "@/lib/task-duration";
import { DEFAULT_TASK_ICON, isTaskIconKey } from "@/lib/task-icons";
import type { TaskFormValues } from "@/lib/task-item";
import { DEFAULT_TASK_PRIORITY, TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/task-priority";
import {
  MAX_REPEAT_INTERVAL,
  REPEAT_FREQUENCIES,
  REPEAT_FREQUENCY_LABEL,
  WEEKDAY_SHORT,
  isRepeatFrequency,
  type RepeatFrequency,
} from "@/lib/task-recurrence";
import { cn } from "@/lib/utils";

export interface TaskFormMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

/** Where a task created from the calendar starts out. */
export interface TaskSeed {
  readonly start: Date;
  readonly allDay: boolean;
  readonly memberId?: string;
  /** From a dragged range on the grid; the default otherwise. */
  readonly durationMinutes?: number;
}

export interface TaskFormProps {
  readonly members: readonly TaskFormMember[];
  /** The task being edited, or null to create one. */
  readonly task: TaskFormValues | null;
  readonly seed: TaskSeed | null;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const DEFAULT_HOUR = 9;
const NO_REPEAT = "";

const pad = (value: number) => String(value).padStart(2, "0");

/** "YYYY-MM-DD" in the browser's zone: what a date input wants. */
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The instant a date and time input describe, as ISO for the hidden field; "" when incomplete. */
function toInstant(date: string, time: string, allDay: boolean): string {
  if (!date) return "";
  const parsed = new Date(allDay ? `${date}T00:00` : `${date}T${time || "00:00"}`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function weekdayOf(date: string): number | null {
  const parsed = new Date(`${date}T12:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getDay();
}

interface ScheduleState {
  readonly isScheduled: boolean;
  readonly date: string;
  readonly time: string;
  readonly allDay: boolean;
  readonly durationMinutes: number;
  readonly frequency: RepeatFrequency | typeof NO_REPEAT;
  readonly interval: string;
  readonly weekdays: ReadonlySet<number>;
  readonly untilDate: string;
}

function initialSchedule(task: TaskFormValues | null, seed: TaskSeed | null): ScheduleState {
  const details = task?.details;
  const dueAt = details?.dueAtIso ? new Date(details.dueAtIso) : (seed?.start ?? null);
  const fallback = new Date();
  fallback.setHours(DEFAULT_HOUR, 0, 0, 0);

  return {
    isScheduled: dueAt !== null,
    date: toDateInput(dueAt ?? fallback),
    time: toTimeInput(dueAt ?? fallback),
    allDay: details?.dueAllDay ?? seed?.allDay ?? false,
    durationMinutes:
      details?.durationMinutes ?? seed?.durationMinutes ?? DEFAULT_TASK_DURATION_MINUTES,
    frequency: details?.repeatFrequency ?? NO_REPEAT,
    interval: String(details?.repeatInterval ?? 1),
    weekdays: new Set(details?.repeatWeekdays ?? []),
    untilDate: details?.repeatUntilIso ? toDateInput(new Date(details.repeatUntilIso)) : "",
  };
}

/**
 * Create or edit a task: everything the Task row holds, plus a schedule and a
 * repeat rule. Mounted fresh each time it opens, so state starts from props.
 * Dates are composed in the browser and sent as instants, the same convention
 * the calendar's event form follows.
 */
export function TaskForm({ members, task, seed, onSaved, onCancel }: TaskFormProps) {
  const [state, formAction, isPending] = useActionState(saveTaskAction, IDLE_SAVE_STATE);
  const [icon, setIcon] = useState(isTaskIconKey(task?.icon) ? task.icon : DEFAULT_TASK_ICON);
  const [schedule, setSchedule] = useState<ScheduleState>(() => initialSchedule(task, seed));

  useEffect(() => {
    if (typeof state.savedAt === "number") onSaved();
  }, [state.savedAt, onSaved]);

  const update = (patch: Partial<ScheduleState>) =>
    setSchedule((current) => ({ ...current, ...patch }));

  const anchorWeekday = weekdayOf(schedule.date);
  // Weekly with nothing ticked means the date's own weekday; show that.
  const shownWeekdays =
    schedule.weekdays.size > 0 || anchorWeekday === null
      ? schedule.weekdays
      : new Set([anchorWeekday]);

  const toggleWeekday = (weekday: number) => {
    const next = new Set(shownWeekdays);
    if (next.has(weekday)) next.delete(weekday);
    else next.add(weekday);
    update({ weekdays: next });
  };

  const handleSubmit = (submit: FormEvent<HTMLFormElement>) => {
    if (schedule.isScheduled && !schedule.date) {
      submit.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
      <input type="hidden" name="dueAt" value={toInstant(schedule.date, schedule.time, schedule.allDay)} />
      <input type="hidden" name="repeatUntil" value={schedule.untilDate ? toInstant(schedule.untilDate, "23:59", false) : ""} />
      {[...shownWeekdays].map((weekday) => (
        <input key={weekday} type="hidden" name="repeatWeekdays" value={weekday} />
      ))}

      <Field>
        <FieldLabel htmlFor="task-title">Task</FieldLabel>
        <Input
          id="task-title"
          name="title"
          defaultValue={task?.title ?? ""}
          placeholder="Brush teeth"
          required
          autoFocus
        />
      </Field>

      <Field>
        <FieldLabel>Icon</FieldLabel>
        <TaskIconPicker value={icon} onChange={setIcon} name="icon" label="Task icon" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="task-member">Who</FieldLabel>
          <select
            id="task-member"
            name="memberId"
            defaultValue={task?.memberId ?? seed?.memberId ?? members[0]?.id ?? ""}
            className={SELECT_CLASS}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
          <select
            id="task-priority"
            name="priority"
            defaultValue={task?.priority ?? DEFAULT_TASK_PRIORITY}
            className={SELECT_CLASS}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABEL[priority]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="task-notes">Notes</FieldLabel>
        <textarea
          id="task-notes"
          name="notes"
          defaultValue={task?.notes ?? ""}
          rows={2}
          placeholder="Optional"
          className="rounded-md border bg-background p-2 text-sm"
        />
      </Field>

      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="scheduled"
            checked={schedule.isScheduled}
            onChange={(change) => update({ isScheduled: change.target.checked })}
            className="size-4"
          />
          Put it on the calendar
        </label>

        {schedule.isScheduled ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="task-date">Date</FieldLabel>
                <Input
                  id="task-date"
                  type="date"
                  value={schedule.date}
                  onChange={(change) => update({ date: change.target.value })}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="task-time">Time</FieldLabel>
                <Input
                  id="task-time"
                  type="time"
                  value={schedule.time}
                  onChange={(change) => update({ time: change.target.value })}
                  disabled={schedule.allDay}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <label className="flex h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="dueAllDay"
                  checked={schedule.allDay}
                  onChange={(change) => update({ allDay: change.target.checked })}
                  className="size-4"
                />
                All day
              </label>
              {schedule.allDay ? null : (
                <Field>
                  <FieldLabel htmlFor="task-duration">Duration</FieldLabel>
                  <select
                    id="task-duration"
                    name="durationMinutes"
                    value={schedule.durationMinutes}
                    onChange={(change) => update({ durationMinutes: Number(change.target.value) })}
                    className={SELECT_CLASS}
                  >
                    {durationChoices(schedule.durationMinutes).map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {formatDuration(minutes)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <Field>
              <FieldLabel htmlFor="task-repeat">Repeat</FieldLabel>
              <select
                id="task-repeat"
                name="repeatFrequency"
                value={schedule.frequency}
                onChange={(change) =>
                  update({
                    frequency: isRepeatFrequency(change.target.value) ? change.target.value : NO_REPEAT,
                  })
                }
                className={SELECT_CLASS}
              >
                <option value={NO_REPEAT}>Does not repeat</option>
                {REPEAT_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {REPEAT_FREQUENCY_LABEL[frequency]}
                  </option>
                ))}
              </select>
            </Field>

            {schedule.frequency ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span>Every</span>
                  <Input
                    type="number"
                    name="repeatInterval"
                    min={1}
                    max={MAX_REPEAT_INTERVAL}
                    value={schedule.interval}
                    onChange={(change) => update({ interval: change.target.value })}
                    aria-label="Repeat every"
                    className="w-16"
                  />
                  <span>
                    {schedule.frequency === "DAILY" && "day(s)"}
                    {schedule.frequency === "WEEKLY" && "week(s)"}
                    {schedule.frequency === "MONTHLY" && "month(s)"}
                    {schedule.frequency === "YEARLY" && "year(s)"}
                  </span>
                </div>

                {schedule.frequency === "WEEKLY" ? (
                  <div role="group" aria-label="Repeat on" className="flex flex-wrap gap-1">
                    {WEEKDAY_SHORT.map((label, weekday) => (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={shownWeekdays.has(weekday)}
                        onClick={() => toggleWeekday(weekday)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                          shownWeekdays.has(weekday)
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="task-until">Ends on</FieldLabel>
                  <Input
                    id="task-until"
                    type="date"
                    value={schedule.untilDate}
                    min={schedule.date}
                    onChange={(change) => update({ untilDate: change.target.value })}
                  />
                  <FieldDescription>Leave empty to repeat forever.</FieldDescription>
                </Field>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <FormError message={state.error} />

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : task ? "Save changes" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
