import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateFamilyForm } from "@/components/onboarding/CreateFamilyForm";
import { requireUserWithoutHousehold } from "@/lib/household";
import { findOwnJoinRequest } from "@/lib/join-requests";

export default async function CreateFamilyPage() {
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
          <CardTitle>Start a new family</CardTitle>
          <CardDescription>
            You will be the owner: you get the family code and decide who joins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateFamilyForm defaultOwnerName={name ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
