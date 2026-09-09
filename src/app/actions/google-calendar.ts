"use server";

import { revalidatePath } from "next/cache";

import { signIn } from "@/auth";
import {
  IDLE_STATE,
  readFormString,
  toActionState,
  type ActionState,
} from "@/lib/action-state";
import {
  createCalendarConnection,
  deleteCalendarConnection,
} from "@/lib/google/connections";
import { resolveConnectableCalendar } from "@/lib/google/linked-accounts";
import { googleCalendarAuthorizationScope } from "@/lib/google/scopes";
import { requireHousehold } from "@/lib/household";

/**
 * Google Calendar actions. Like the onboarding actions, every one re-derives
 * who the caller is from the session and treats the form as untrusted: the
 * account must be the caller's own, the member must be in their household,
 * and the calendar is re-fetched from Google rather than taken on trust.
 */

const LOG_TAG = "google-calendar";
const SETTINGS_PATH = "/settings";
const CALENDAR_PATH = "/calendar";

/**
 * Send the signed-in user through Google's consent screen for calendar access.
 *
 * `select_account` forces Google's account chooser — without it Google
 * silently reuses whichever account the browser is signed into, and a second
 * account can never be picked. `consent` guarantees a refresh token, which
 * only a consent screen produces. The tokens land via the signIn event in
 * src/auth.ts, which is what makes this work for an account that is already
 * linked as the sign-in account.
 */
export async function connectGoogleAccountAction(): Promise<void> {
  await requireHousehold();
  await signIn(
    "google",
    { redirectTo: SETTINGS_PATH },
    {
      scope: googleCalendarAuthorizationScope(),
      access_type: "offline",
      prompt: "consent select_account",
    },
  );
}

export async function addCalendarConnectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { household, userId } = await requireHousehold();

    const accountId = readFormString(formData, "accountId");
    const googleCalendarId = readFormString(formData, "googleCalendarId");
    if (!accountId || !googleCalendarId) return { error: "Pick a calendar to connect." };

    const memberId = readFormString(formData, "memberId");
    const member = household.members.find((candidate) => candidate.id === memberId);
    if (!member) return { error: "Pick who this calendar belongs to." };

    const { accountEmail, calendar } = await resolveConnectableCalendar(
      userId,
      accountId,
      googleCalendarId,
    );
    await createCalendarConnection(household.id, {
      accountId,
      memberId: member.id,
      googleCalendarId: calendar.id,
      summary: calendar.name,
      accountEmail,
    });
  } catch (error) {
    return toActionState(error, LOG_TAG);
  }

  revalidatePath(SETTINGS_PATH);
  revalidatePath(CALENDAR_PATH);
  return IDLE_STATE;
}

export async function removeCalendarConnectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { household, userId, isOwner } = await requireHousehold();
    await deleteCalendarConnection(household.id, readFormString(formData, "connectionId"), {
      userId,
      isOwner,
    });
  } catch (error) {
    return toActionState(error, LOG_TAG);
  }

  revalidatePath(SETTINGS_PATH);
  revalidatePath(CALENDAR_PATH);
  return IDLE_STATE;
}
