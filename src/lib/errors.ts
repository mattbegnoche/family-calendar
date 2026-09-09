/**
 * An error whose message is safe — and intended — to show the person who
 * triggered it.
 *
 * Server actions catch this and render `message` verbatim; anything else is
 * reported as a generic failure and logged, so an unexpected stack trace or a
 * database constraint name never reaches the browser.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function isUserFacingError(error: unknown): error is UserFacingError {
  return error instanceof UserFacingError;
}
