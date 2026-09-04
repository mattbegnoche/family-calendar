"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutUser() {
  await signOut({ redirectTo: "/login" });
}

/**
 * Attach another Google account to the signed-in user.
 *
 * `select_account` forces Google's account chooser — without it Google silently
 * reuses whichever account the browser is already signed into, and you can
 * never pick a different one. `consent` guarantees a refresh token for the new
 * account, which Auth.js only ever writes once, at link time.
 */
export async function linkGoogleAccount() {
  await signIn(
    "google",
    { redirectTo: "/settings" },
    { prompt: "select_account consent" },
  );
}
