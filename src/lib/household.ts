import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in user's household, their role in it, and its members.
 *
 * Depends on the `session` callback in src/auth.ts putting `id` back on the
 * session user — @auth/core's default callback rebuilds it as
 * { name, email, image } and drops the id.
 *
 * cache() dedupes the query across a single render pass.
 */
export const requireHousehold = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      householdRole: true,
      household: {
        select: {
          id: true,
          name: true,
          timeZone: true,
          color: true,
          icon: true,
          members: {
            where: { archivedAt: null },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              slug: true,
              name: true,
              color: true,
              kind: true,
              sortOrder: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!user) redirect("/login");
  // Belonging to no household is now an ordinary state — a new sign-in has
  // not created or joined one yet — so it routes to onboarding rather than
  // throwing the way it did when households were seeded by hand.
  if (!user.household) redirect("/onboarding");

  return {
    userId: user.id,
    role: user.householdRole ?? "ADULT",
    isOwner: user.householdRole === "OWNER",
    household: user.household,
  };
});

export type Household = Awaited<ReturnType<typeof requireHousehold>>["household"];
export type Member = Household["members"][number];

/**
 * Same as requireHousehold, but refuses anyone who is not an owner.
 *
 * Every server action that reads the family code, rotates it, or acts on a
 * join request calls this — authorisation lives in the action, not in the page
 * that renders the button, because a server action is reachable by direct POST
 * whether or not the UI ever showed the control.
 */
export const requireOwner = cache(async () => {
  const context = await requireHousehold();
  if (!context.isOwner) {
    redirect("/settings");
  }
  return context;
});

/**
 * The encrypted code column, fetched only where it is actually needed.
 *
 * Kept out of requireHousehold on purpose: that runs on every dashboard
 * render, and the ciphertext has no business being in the payload of a page
 * that only wants to draw a sidebar.
 */
export async function fetchHouseholdCodeCiphertext(
  householdId: string,
): Promise<string> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { codeCiphertext: true },
  });
  return household?.codeCiphertext ?? "";
}

/**
 * The signed-in user, asserted NOT to belong to a household yet.
 *
 * The guard every onboarding page shares. Sends anyone who already has a
 * household back to the dashboard, so a bookmarked /onboarding cannot be used
 * to start a second family or re-run setup.
 */
export const requireUserWithoutHousehold = cache(async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, householdId: true },
  });
  if (!user) redirect("/login");
  if (user.householdId) redirect("/");

  return { userId: user.id, name: user.name, email: user.email };
});
