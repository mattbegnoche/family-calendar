import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Every address allowed to sign in. Config rather than code so adding an
 * address is an env change, not a deploy.
 */
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;

/**
 * Google is the sign-in method only. No `authorization` block, so the provider
 * requests its defaults (openid, email, profile) — no calendar scope, and no
 * offline access, so no refresh token is stored.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: NINETY_DAYS_IN_SECONDS },

  // Auth.js builds callback URLs from the Host header when this is on. Fine on
  // localhost; in production set AUTH_URL instead, so a forged Host header
  // cannot influence where Google sends the authorization code.
  trustHost: process.env.NODE_ENV === "development",

  providers: [Google],

  callbacks: {
    signIn({ user }) {
      const email = user.email?.toLowerCase();
      return !!email && ALLOWED_EMAILS.includes(email);
    },
    session({ session, user }) {
      // The adapter's getSessionAndUser already does include: { user: true },
      // so the full row is in hand — this costs no extra query.
      session.user.id = user.id;
      return session;
    },
  },
});
