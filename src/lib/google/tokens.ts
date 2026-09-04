import "server-only";

import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Refresh a little early so a request can't expire mid-flight. */
const EXPIRY_SKEW_SECONDS = 60;

interface RefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * A valid Google access token for one linked Account, refreshing it when stale.
 *
 * This has to exist in application code: Auth.js writes Account tokens exactly
 * once, when the account is first linked, and never updates them again. Access
 * tokens last about an hour, so without this nothing works past the first hour
 * of a session.
 */
export async function getGoogleAccessToken(accountId: string): Promise<string> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  });

  if (!account) {
    throw new Error(`No linked account ${accountId}`);
  }

  const isFresh =
    account.access_token &&
    account.expires_at &&
    account.expires_at - EXPIRY_SKEW_SECONDS > nowInSeconds();

  if (isFresh && account.access_token) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    // Not recoverable by signing in again — Auth.js will not rewrite the row.
    throw new Error(
      `Account ${accountId} has no refresh token. Disconnect and reconnect the Google account.`,
    );
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Google token refresh failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const refreshed = (await response.json()) as RefreshResponse;

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.access_token,
      expires_at: nowInSeconds() + refreshed.expires_in,
    },
  });

  return refreshed.access_token;
}
