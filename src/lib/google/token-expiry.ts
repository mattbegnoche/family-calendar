/** Refresh a little early so a request can't expire mid-flight. */
const EXPIRY_SKEW_SECONDS = 60;

export function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Whether a stored access token can still be used, given Auth.js's
 * `expires_at` (epoch seconds, or null when Google sent no expiry).
 *
 * Kept apart from the refresh code so it can be unit-tested without Prisma.
 */
export function isAccessTokenFresh(
  expiresAt: number | null | undefined,
  now: number = nowInSeconds(),
): boolean {
  if (expiresAt === null || expiresAt === undefined) return false;
  return expiresAt - EXPIRY_SKEW_SECONDS > now;
}
