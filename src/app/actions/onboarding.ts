"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  IDLE_STATE,
  readFormString,
  toActionState,
  type ActionState,
} from "@/lib/action-state";
import { UserFacingError } from "@/lib/errors";
import {
  createHousehold,
  rotateFamilyCode,
  updateHouseholdBranding,
  type NewMemberInput,
} from "@/lib/household-setup";
import { requireOwner, requireUserWithoutHousehold } from "@/lib/household";
import {
  DEFAULT_HOUSEHOLD_COLOR,
  DEFAULT_HOUSEHOLD_ICON,
  isHouseholdIconKey,
} from "@/lib/household-icons";
import {
  approveJoinRequest,
  cancelOwnJoinRequest,
  denyJoinRequest,
  requestToJoin,
} from "@/lib/join-requests";
import {
  MAX_HOUSEHOLD_NAME_LENGTH,
  isHexColor,
  validateMemberName,
} from "@/lib/members";
import { isValidTimeZone } from "@/lib/time-zones";

/**
 * Onboarding and household-administration actions.
 *
 * Every one of these re-derives who the caller is and what they may do from
 * the session — never from the submitted form — because a server action is
 * reachable by direct POST whether or not the UI ever rendered the control
 * that calls it.
 */

/**
 * Extends UserFacingError rather than Error: isUserFacingError tests
 * `instanceof UserFacingError`, so a look-alike class with the same `name`
 * would be reported as a generic failure and the message lost.
 */
class ValidationError extends UserFacingError {}

/** A family with more rows than this is a mistake or an abuse, not a family. */
const MAX_OTHER_MEMBERS = 15;

function parseOtherMembers(formData: FormData): NewMemberInput[] {
  const names = formData.getAll("memberName");
  const colors = formData.getAll("memberColor");

  const members: NewMemberInput[] = [];
  for (const [index, rawName] of names.entries()) {
    if (typeof rawName !== "string") continue;
    // A blank row is someone who clicked "add" and changed their mind, not an
    // error worth stopping the whole form for.
    if (!rawName.trim()) continue;

    const name = validateMemberName(rawName);
    if (!name) {
      throw new ValidationError(
        `"${rawName.trim().slice(0, 20)}" is not a usable name.`,
      );
    }

    const rawColor = colors[index];
    const color = typeof rawColor === "string" ? rawColor : "";
    if (!isHexColor(color)) {
      throw new ValidationError(`Pick a colour for ${name}.`);
    }

    members.push({ name, color });
  }

  if (members.length > MAX_OTHER_MEMBERS) {
    throw new ValidationError(`A family can start with at most ${MAX_OTHER_MEMBERS} extra people.`);
  }
  return members;
}

export async function createFamilyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { userId } = await requireUserWithoutHousehold();

    const name = readFormString(formData, "familyName");
    if (!name || name.length > MAX_HOUSEHOLD_NAME_LENGTH) {
      return { error: "Give your family a name." };
    }

    const timeZone = readFormString(formData, "timeZone");
    if (!isValidTimeZone(timeZone)) {
      return { error: "Pick a valid time zone." };
    }

    const color = readFormString(formData, "color") || DEFAULT_HOUSEHOLD_COLOR;
    if (!isHexColor(color)) return { error: "Pick a valid colour." };

    const icon = readFormString(formData, "icon") || DEFAULT_HOUSEHOLD_ICON;
    if (!isHouseholdIconKey(icon)) return { error: "Pick a valid icon." };

    const ownerName = validateMemberName(readFormString(formData, "ownerName"));
    if (!ownerName) return { error: "Enter the name you want on the calendar." };

    const ownerColor = readFormString(formData, "ownerColor");
    if (!isHexColor(ownerColor)) return { error: "Pick your calendar colour." };

    await createHousehold(userId, {
      name,
      timeZone,
      color,
      icon,
      owner: { name: ownerName, color: ownerColor },
      others: parseOtherMembers(formData),
    });
  } catch (error) {
    return toActionState(error, "onboarding");
  }

  // Outside the try: redirect() signals by throwing, so catching around it
  // would turn a successful submit into "something went wrong".
  redirect("/onboarding/code");
}

export async function joinFamilyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { userId } = await requireUserWithoutHousehold();

    const name = validateMemberName(readFormString(formData, "name"));
    if (!name) return { error: "Enter the name you want on the calendar." };

    const color = readFormString(formData, "color");
    if (!isHexColor(color)) return { error: "Pick your calendar colour." };

    await requestToJoin(userId, {
      code: readFormString(formData, "code"),
      name,
      color,
    });
  } catch (error) {
    return toActionState(error, "onboarding");
  }

  redirect("/onboarding/pending");
}

export async function cancelJoinRequestAction(): Promise<void> {
  const { userId } = await requireUserWithoutHousehold();
  await cancelOwnJoinRequest(userId);
  redirect("/onboarding");
}

export async function approveJoinRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { household, userId } = await requireOwner();
    await approveJoinRequest(household.id, readFormString(formData, "requestId"), userId);
  } catch (error) {
    return toActionState(error, "onboarding");
  }

  // "layout" because approving adds a member, and the member dots live in the
  // sidebar, which is rendered by the dashboard layout rather than the page.
  revalidatePath("/", "layout");
  return IDLE_STATE;
}

export async function denyJoinRequestAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { household, userId } = await requireOwner();
    await denyJoinRequest(household.id, readFormString(formData, "requestId"), userId);
  } catch (error) {
    return toActionState(error, "onboarding");
  }

  revalidatePath("/settings");
  return IDLE_STATE;
}

export async function rotateFamilyCodeAction(
  _previous: ActionState,
): Promise<ActionState> {
  try {
    const { household } = await requireOwner();
    await rotateFamilyCode(household.id);
  } catch (error) {
    return toActionState(error, "onboarding");
  }

  revalidatePath("/settings");
  return IDLE_STATE;
}

export async function updateFamilyBrandingAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { household } = await requireOwner();

    const name = readFormString(formData, "familyName");
    if (!name || name.length > MAX_HOUSEHOLD_NAME_LENGTH) {
      return { error: "Give your family a name." };
    }

    const color = readFormString(formData, "color");
    if (!isHexColor(color)) return { error: "Pick a valid colour." };

    const icon = readFormString(formData, "icon");
    if (!isHouseholdIconKey(icon)) return { error: "Pick a valid icon." };

    const timeZone = readFormString(formData, "timeZone");
    if (!isValidTimeZone(timeZone)) return { error: "Pick a valid time zone." };

    await updateHouseholdBranding(household.id, { name, color, icon, timeZone });
  } catch (error) {
    return toActionState(error, "onboarding");
  }

  revalidatePath("/", "layout");
  return IDLE_STATE;
}
