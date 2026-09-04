import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const requireUser = cache(async () => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login");
  return { ...user, id: user.id };
});
