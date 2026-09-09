import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JoinFamilyForm } from "@/components/onboarding/JoinFamilyForm";
import { requireUserWithoutHousehold } from "@/lib/household";
import { findOwnJoinRequest } from "@/lib/join-requests";

export default async function JoinFamilyPage() {
  const { userId, name } = await requireUserWithoutHousehold();

  const request = await findOwnJoinRequest(userId);
  if (request?.status === "PENDING") redirect("/onboarding/pending");

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/onboarding"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Join an existing family</CardTitle>
          <CardDescription>
            Enter the code you were given and pick how you want to appear on the calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinFamilyForm defaultName={name ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
