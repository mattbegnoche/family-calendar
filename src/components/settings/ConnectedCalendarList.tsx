"use client";

import { useActionState } from "react";
import { Link2, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/onboarding/FormError";
import {
  connectGoogleAccountAction,
  removeCalendarConnectionAction,
} from "@/app/actions/google-calendar";
import type { GoogleEditability } from "@/lib/google/editability";
import { IDLE_STATE } from "@/lib/action-state";

export interface ConnectedCalendarView {
  readonly id: string;
  readonly summary: string;
  readonly accountEmail: string;
  readonly memberName: string;
  readonly memberColor: string;
  /** Owners may remove any calendar; others only ones read through their own account. */
  readonly canRemove: boolean;
  /** Whether the signed-in user may edit this calendar's events, and if not, why. */
  readonly access: GoogleEditability;
}

const ACCESS_LABEL: Record<GoogleEditability, string> = {
  editable: "you can edit its events",
  "not-owner": "read-only for you",
  "needs-reconnect": "read-only until you reconnect",
};

function ConnectedCalendarRow({ calendar }: { calendar: ConnectedCalendarView }) {
  const [state, remove, isRemoving] = useActionState(removeCalendarConnectionAction, IDLE_STATE);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: calendar.memberColor }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{calendar.summary}</p>
          <p className="truncate text-xs text-muted-foreground">
            {calendar.accountEmail} · shown under {calendar.memberName} ·{" "}
            {ACCESS_LABEL[calendar.access]}
          </p>
        </div>
        {calendar.access === "needs-reconnect" ? (
          // The same consent flow as connecting; this time it asks for write access.
          <form action={connectGoogleAccountAction}>
            <Button type="submit" variant="outline" size="sm">
              <Link2 className="size-4" />
              Reconnect
            </Button>
          </form>
        ) : null}
        {calendar.canRemove ? (
          <form action={remove}>
            <input type="hidden" name="connectionId" value={calendar.id} />
            <Button type="submit" variant="ghost" size="sm" disabled={isRemoving}>
              <Unlink className="size-4" />
              {isRemoving ? "Removing…" : "Remove"}
            </Button>
          </form>
        ) : null}
      </div>
      <FormError message={state.error} />
    </li>
  );
}

export function ConnectedCalendarList({ calendars }: { calendars: readonly ConnectedCalendarView[] }) {
  if (calendars.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No Google calendars are connected yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {calendars.map((calendar) => (
        <ConnectedCalendarRow key={calendar.id} calendar={calendar} />
      ))}
    </ul>
  );
}
