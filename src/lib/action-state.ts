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
