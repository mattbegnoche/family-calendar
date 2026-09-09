import { redirect } from "next/navigation";
import { Clock, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelJoinRequestAction } from "@/app/actions/onboarding";
import { requireUserWithoutHousehold } from "@/lib/household";
import { findOwnJoinRequest } from "@/lib/join-requests";

/**
 * Approval happens in someone else's session, so this page must never be served
 * from a cache — a stale render would leave the applicant staring at "waiting"
 * after they had already been let in.
 */
export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const { userId } = await requireUserWithoutHousehold();

  const request = await findOwnJoinRequest(userId);
  if (!request || request.status !== "PENDING") redirect("/onboarding");

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Clock className="size-5" />
        </div>
        <CardTitle>Waiting for approval</CardTitle>
        <CardDescription>
          You asked to join <strong>{request.householdName}</strong> as{" "}
          <strong>{request.requestedName}</strong>. An owner of that family needs to
          approve you before you can see the calendar.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* A plain link, not a client-side refresh: a full navigation is the
            simplest thing that always re-runs the query above. */}
        <Button size="lg" render={<a href="/onboarding/pending" />}>
          <RotateCw className="size-4" />
          Check again
        </Button>

        <form action={cancelJoinRequestAction}>
          <Button type="submit" variant="ghost" size="sm" className="w-full">
            Cancel this request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
