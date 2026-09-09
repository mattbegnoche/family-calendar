import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, KeyRound, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireUserWithoutHousehold } from "@/lib/household";
import { findOwnJoinRequest } from "@/lib/join-requests";

export default async function OnboardingPage() {
  const { userId, name } = await requireUserWithoutHousehold();

  // Someone mid-request should see where they stand, not be offered the choice
  // again — the back button and a stale bookmark both land here.
  const request = await findOwnJoinRequest(userId);
  if (request?.status === "PENDING") redirect("/onboarding/pending");

  const greeting = name ? `Welcome, ${name.split(" ")[0]}` : "Welcome";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{greeting}</h1>
        <p className="mt-1 text-muted-foreground">
          Set up your family calendar, or join one that already exists.
        </p>
      </div>

      <Card className="transition hover:border-primary/50">
        <CardContent className="p-0">
          <Link
            href="/onboarding/create"
            className="flex items-center gap-4 rounded-xl p-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[#4f46e5] to-[#7c3aed] text-white">
              <Sparkles className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Start a new family</span>
              <span className="block text-sm text-muted-foreground">
                Name it, add everyone, and get a code to invite the other adults.
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      <Card className="transition hover:border-primary/50">
        <CardContent className="p-0">
          <Link
            href="/onboarding/join"
            className="flex items-center gap-4 rounded-xl p-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <KeyRound className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">Join an existing family</span>
              <span className="block text-sm text-muted-foreground">
                You will need the family code and an owner to approve you.
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {request?.status === "DENIED" ? (
        <p className="text-sm text-muted-foreground">
          Your request to join {request.householdName} was declined. You can try another
          code or start your own family.
        </p>
      ) : null}
    </div>
  );
}
