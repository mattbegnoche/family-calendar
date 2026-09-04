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

  // trustHost is deliberately NOT set here. @auth/core defaults it with `??`,
  // so any explicit value — including `false` — defeats its own logic:
  //   trustHost ??= !!(AUTH_URL ?? AUTH_TRUST_HOST ?? VERCEL ?? NODE_ENV !== "production")
  // Locally that resolves true via NODE_ENV; on Vercel via AUTH_URL, which also
  // pins the callback URL so a forged Host header cannot redirect the OAuth code.

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
