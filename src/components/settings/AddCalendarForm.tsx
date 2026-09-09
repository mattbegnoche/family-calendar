"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, Link2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { FormError } from "@/components/onboarding/FormError";
import {
  addCalendarConnectionAction,
  connectGoogleAccountAction,
} from "@/app/actions/google-calendar";
import { IDLE_STATE } from "@/lib/action-state";
import type { LinkedGoogleAccount } from "@/lib/google/types";

export interface MemberOption {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface AddCalendarFormProps {
  /** The signed-in user's Google accounts that granted calendar access. */
  readonly accounts: readonly LinkedGoogleAccount[];
  readonly members: readonly MemberOption[];
  /** Preselected: the member linked to the signed-in user, or the first one. */
  readonly defaultMemberId: string;
  /** Already connected to this household; left out of the picker. */
  readonly connectedCalendarIds: readonly string[];
}

interface CalendarChoice {
  readonly accountId: string;
  readonly accountEmail: string;
  readonly calendarId: string;
  readonly name: string;
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function LinkAccountButton({ label }: { label: string }) {
  return (
    <form action={connectGoogleAccountAction}>
      <Button type="submit" variant="outline" size="sm">
        <Link2 className="size-4" />
        {label}
      </Button>
    </form>
  );
}

/** Which of the user's calendars can still be added, grouped under the account they belong to. */
function choicesFrom(
  accounts: readonly LinkedGoogleAccount[],
  connectedCalendarIds: readonly string[],
): CalendarChoice[] {
  const connected = new Set(connectedCalendarIds);
  return accounts.flatMap((account) =>
    account.calendars
      .filter((calendar) => !connected.has(calendar.id))
      .map((calendar) => ({
        accountId: account.id,
        accountEmail: account.email,
        calendarId: calendar.id,
        name: calendar.isPrimary ? `${calendar.name} (primary)` : calendar.name,
      })),
  );
}

export function AddCalendarForm({
  accounts,
  members,
  defaultMemberId,
  connectedCalendarIds,
}: AddCalendarFormProps) {
  const [state, formAction, isPending] = useActionState(addCalendarConnectionAction, IDLE_STATE);
  const choices = choicesFrom(accounts, connectedCalendarIds);
  // The select's value is an index into `choices`; the hidden inputs below
  // carry the real account and calendar ids the action needs.
  const [choiceIndex, setChoiceIndex] = useState(0);
  const choice = choices[Math.min(choiceIndex, Math.max(0, choices.length - 1))];

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Connect a Google account to show its calendars here. You will be asked for
          read-only access to your calendars; nothing is written back.
        </p>
        <form action={connectGoogleAccountAction}>
          <Button type="submit" size="sm">
            <CalendarPlus className="size-4" />
            Connect Google Calendar
          </Button>
        </form>
      </div>
    );
  }

  const emails = accounts.map((account) => account.email);

  return (
    <div className="flex flex-col gap-4">
      {accounts
        .filter((account) => account.error)
        .map((account) => (
          <p
            key={account.id}
            className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {account.email}: {account.error}
            </span>
          </p>
        ))}

      {choice ? (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="accountId" value={choice.accountId} />
          <input type="hidden" name="googleCalendarId" value={choice.calendarId} />

          <Field>
            <FieldLabel htmlFor="google-calendar">Calendar</FieldLabel>
            <select
              id="google-calendar"
              value={choiceIndex}
              onChange={(change) => setChoiceIndex(Number(change.target.value))}
              className={SELECT_CLASS}
            >
              {accounts.map((account) => (
                <optgroup key={account.id} label={account.email}>
                  {choices.map((candidate, index) =>
                    candidate.accountId === account.id ? (
                      <option key={candidate.calendarId} value={index}>
                        {candidate.name}
                      </option>
                    ) : null,
                  )}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="google-calendar-member">Show under</FieldLabel>
            <select
              id="google-calendar-member"
              name="memberId"
              defaultValue={defaultMemberId}
              className={SELECT_CLASS}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <FieldDescription>
              Events from this calendar take that person&apos;s colour and column.
            </FieldDescription>
          </Field>

          <FormError message={state.error} />

          <Button type="submit" size="sm" disabled={isPending} className="self-start">
            <CalendarPlus className="size-4" />
            {isPending ? "Connecting…" : "Connect calendar"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Every calendar on {emails.join(", ")} is already connected.
        </p>
      )}

      <div className="border-t pt-3">
        <LinkAccountButton label="Link another Google account" />
      </div>
    </div>
  );
}
