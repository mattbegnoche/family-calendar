import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

function parseEmailList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Addresses that may sign in and own a user account: the two adults. */
const ALLOWED_EMAILS = parseEmailList(process.env.ALLOWED_EMAILS);

/**
 * Extra Google accounts whose calendars you want to read. These may only ever
 * be LINKED to an existing signed-in user, never used to sign in cold.
 *
 * The distinction matters: signed out, Auth.js finds no account and no user
 * with that email, and falls through to createUser — silently splitting the
 * household across two user rows. Requiring a live session makes the only
 * reachable path the linking branch.
 */
const LINKABLE_EMAILS = parseEmailList(process.env.LINKABLE_EMAILS);

const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: NINETY_DAYS_IN_SECONDS },

  // Auth.js builds callback URLs from the Host header when this is on. Fine on
  // localhost; in production set AUTH_URL instead, so a forged Host header
  // cannot influence where Google sends the authorization code.
  trustHost: process.env.NODE_ENV === "development",

  providers: [
    Google({
      authorization: {
        params: {
          // Both are required to receive a refresh_token, and Auth.js writes
          // Account tokens exactly once (at link time) and never updates them.
          // Getting this wrong is not self-healing.
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            // Read + write events on calendars the user already has write
            // access to. Deliberately NOT the broad "calendar" scope, which
            // also grants creating and deleting whole calendars — this app
            // never does that.
            "https://www.googleapis.com/auth/calendar.events",
            // Needed separately: calendar.events does not permit listing the
            // user's calendars, which the connect-a-calendar picker requires.
            "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
          ].join(" "),
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (ALLOWED_EMAILS.includes(email)) return true;
      if (!LINKABLE_EMAILS.includes(email)) return false;
      // Linking only: Auth.js attaches a new account to the current user when
      // one is signed in, so require that rather than allowing a cold sign-in.
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
});
