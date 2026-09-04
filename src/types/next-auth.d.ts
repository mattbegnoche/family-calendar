import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * `session.user.id` is populated by the session callback in src/auth.ts.
   * Without this augmentation it is not on the default Session type.
   */
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
