import { isUserFacingError } from "@/lib/errors";

/**
 * The shape every form action returns to `useActionState`.
 *
 * Lives here rather than beside the actions because a "use server" module may
 * only export async functions — a constant exported from one is a build error.
 */
export interface ActionState {
  readonly error: string | null;
}

export const IDLE_STATE: ActionState = { error: null };

/**
 * For forms that stay open after a save and need to know it happened: the
 * moment of the last successful save. Changes on every success, so a form
 * can react each time; null until then.
 *
 * Here and not beside the action on purpose. A "use server" module may export
 * only async functions — a constant exported from one is silently replaced on
 * the client by a server-action reference, and a form comparing that against
 * null would believe it had already saved.
 */
export interface SaveActionState extends ActionState {
  readonly savedAt: number | null;
}

export const IDLE_SAVE_STATE: SaveActionState = { error: null, savedAt: null };

const GENERIC_FAILURE = "Something went wrong. Please try again.";

/**
 * UserFacingError messages are written for the person who triggered them and
 * are shown as-is. Anything else is logged under `logTag` and reported
 * generically, so a database constraint name or a stack trace never reaches
 * the browser.
 */
export function toActionState(error: unknown, logTag: string): ActionState {
  if (isUserFacingError(error)) return { error: error.message };
  console.error(`[${logTag}] action failed:`, error);
  return { error: GENERIC_FAILURE };
}

/** A trimmed text field, or "" when absent or a file — never undefined. */
export function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
