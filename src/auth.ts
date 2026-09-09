import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { persistGoogleTokens } from "@/lib/google/tokens";
import { prisma } from "@/lib/prisma";

/**
 * Optional sign-in allow-list.
 *
 * EMPTY NOW MEANS OPEN, which is the reverse of what it meant when this app
 * served one hand-seeded family. Any family can sign up and create their own
 * household, so who may *authenticate* is no longer the access control that
 * matters — what protects a family's calendar is household membership, and
 * joining an existing one needs both the secret code and an owner's approval.
 *
 * Setting the variable still pins a private deployment shut, e.g. during a
 * closed beta.
 */
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

/**
 * Google is the sign-in method, and the provider is left at its defaults:
 * openid, email, profile. No calendar scope and no offline access here. Those
 * are requested from Settings — see src/app/actions/google-calendar.ts — and
 * only for the accounts someone chooses to connect, so signing up to make a
 * family never asks for calendar access.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: NINETY_DAYS_IN_SECONDS },

  // trustHost is deliberately NOT set here. @auth/core defaults it with `??`,
  // so any explicit value — including `false` — defeats its own logic:
  //   trustHost ??= !!(AUTH_URL ?? AUTH_TRUST_HOST ?? VERCEL ?? NODE_ENV !== "production")
  // Locally that resolves true via NODE_ENV; on Vercel via AUTH_URL, which also
  // pins the callback URL so a forged Host header cannot redirect the OAuth code.

  providers: [Google],

  callbacks: {
    async signIn({ user }) {
      if (ALLOWED_EMAILS.length === 0) return true;
      const email = user.email?.toLowerCase();
      if (email && ALLOWED_EMAILS.includes(email)) return true;

      // An address outside the list may still be LINKED — attached as a
      // second Google account to someone already signed in, so its calendar
      // can be read — but never used to sign in cold. Auth.js only links when
      // a session exists; without one it would create a new user, which is
      // exactly what the list exists to prevent.
      const session = await auth();
      return !!session?.user;
    },
    session({ session, user }) {
      // The adapter's getSessionAndUser already does include: { user: true },
      // so the full row is in hand — this costs no extra query.
      session.user.id = user.id;
      return session;
    },
  },

  events: {
    /**
     * Auth.js writes Account tokens once, when the account is first linked,
     * and never again. Connecting a calendar re-authorises an account that
     * usually already exists — the one the person signed in with — so the
     * wider grant would be dropped on the floor without this.
     */
    async signIn({ account }) {
      if (!account) return;
      try {
        await persistGoogleTokens(account);
      } catch (error) {
        // Sign-in itself succeeded; failing it here would lock someone out
        // over a calendar. Logged so a silent "connect did nothing" has a trail.
        console.error("[auth] could not persist Google tokens", error);
      }
    },
  },
});
