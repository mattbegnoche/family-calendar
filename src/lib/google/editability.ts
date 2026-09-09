import { hasGoogleCalendarWriteScope } from "@/lib/google/scopes";

/**
 * Who may change the events of a connected Google calendar: the person whose
 * Google account it is read through, and only once that account has granted
 * the write scope. Pure, so the rule is unit-tested and the server action and
 * the calendar page cannot disagree about it.
 */
export type GoogleEditability = "editable" | "not-owner" | "needs-reconnect";

export interface ConnectionAccount {
  readonly userId: string;
  readonly scope: string | null;
}

export function googleEditability(account: ConnectionAccount, currentUserId: string): GoogleEditability {
  if (account.userId !== currentUserId) return "not-owner";
  return hasGoogleCalendarWriteScope(account.scope) ? "editable" : "needs-reconnect";
}

export const EDITABILITY_NOTE: Record<Exclude<GoogleEditability, "editable">, string> = {
  "not-owner": "Only the person who connected this calendar can edit its events.",
  "needs-reconnect":
    "This calendar was connected read-only. Reconnect it in Settings to edit its events.",
};
