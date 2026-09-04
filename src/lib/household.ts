import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The signed-in user's household and its members.
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
      household: {
        select: {
          id: true,
          name: true,
          timeZone: true,
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
  if (!user.household) {
    // Households are seeded by hand for now (src/prisma/seed.mjs); there is no
    // create-a-household flow yet, so this is a setup problem, not a user one.
    throw new Error(
      `User ${user.email} belongs to no household. Run: node src/prisma/seed.mjs`,
    );
  }

  return { userId: user.id, household: user.household };
});

export type Household = Awaited<ReturnType<typeof requireHousehold>>["household"];
export type Member = Household["members"][number];
