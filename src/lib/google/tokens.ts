import "server-only";

import type { Account } from "next-auth";

import { GoogleApiError, GoogleTokenError } from "@/lib/google/errors";
import { isAccessTokenFresh, nowInSeconds } from "@/lib/google/token-expiry";
import { hasGoogleCalendarScope } from "@/lib/google/scopes";
import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PROVIDER = "google";

interface RefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
}

function oauthClient(): { clientId: string; clientSecret: string } {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are not configured");
  }
  return { clientId, clientSecret };
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  const { clientId, clientSecret } = oauthClient();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    // invalid_grant is Google's word for "this refresh token is dead": the
    // user revoked access, or the grant expired. Nothing short of a fresh
    // consent recovers it, so say so rather than reporting a generic 400.
    if (detail.includes("invalid_grant")) {
      throw new GoogleTokenError("Google revoked this account's access.");
    }
    throw new GoogleApiError(response.status, "token refresh", detail);
  }

  return (await response.json()) as RefreshResponse;
}

/**
 * A valid Google access token for one linked Account, refreshing it when stale.
 *
 * This has to exist in application code: Auth.js writes Account tokens at
 * link time and, for an account that already exists, never touches them again
 * (see persistGoogleTokens for the one place this app does). Access tokens
 * last about an hour, so without a refresh path nothing works past the first
 * hour after connecting.
 */
export async function getGoogleAccessToken(accountId: string): Promise<string> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  });

  if (!account) throw new GoogleTokenError(`No linked account ${accountId}.`);

  if (account.access_token && isAccessTokenFresh(account.expires_at)) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new GoogleTokenError(
      `Account ${accountId} has no refresh token; it must be reconnected.`,
    );
  }

  const refreshed = await refreshAccessToken(account.refresh_token);

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.access_token,
      expires_at: nowInSeconds() + refreshed.expires_in,
    },
  });

  return refreshed.access_token;
}

/**
 * Store the tokens Google just issued, when they carry calendar access.
 *
 * Called from the `signIn` event in src/auth.ts, which fires on every
 * successful OAuth callback with the fresh token set — including when the
 * account row already exists, the case Auth.js itself never writes. That is
 * what makes "connect calendar" work for the very account someone signed in
 * with: the consent flow re-authorises the same Google account, and this is
 * the only code path that would ever record the wider grant.
 *
 * Plain sign-ins are ignored: their tokens carry no calendar scope, and
 * overwriting a calendar-scoped access token with a narrower one would break
 * imports for an hour every time someone logged in.
 */
export async function persistGoogleTokens(account: Account): Promise<void> {
  if (account.provider !== GOOGLE_PROVIDER) return;
  if (!hasGoogleCalendarScope(account.scope)) return;

  await prisma.account.updateMany({
    where: {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    },
    data: {
      access_token: account.access_token ?? null,
      expires_at: account.expires_at ?? null,
      scope: account.scope ?? null,
      token_type: account.token_type ?? null,
      id_token: account.id_token ?? null,
      // Google only sends a refresh token when the user was shown a consent
      // screen. Absent, the stored one is still the good one — keep it.
      ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
    },
  });
}
