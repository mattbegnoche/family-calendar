import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FamilyCodeDisplay } from "@/components/onboarding/FamilyCodeDisplay";
import { fetchHouseholdCodeCiphertext, requireOwner } from "@/lib/household";
import { readFamilyCode } from "@/lib/household-setup";

/** The "your family is ready" screen shown straight after creating one. */
export default async function FamilyCodePage() {
  const { household } = await requireOwner();

  // Decrypted here rather than passed through the redirect: a code in a query
  // string ends up in browser history, server logs and any referrer header.
  const code = readFamilyCode(await fetchHouseholdCodeCiphertext(household.id));

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle>{household.name} is ready</CardTitle>
        <CardDescription>
          Share this code with the other adults in your family so they can request to
          join. You will be asked to approve each of them.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {code ? (
          <FamilyCodeDisplay code={code} />
        ) : (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Your code could not be read. Generate a new one from settings.
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          Treat it like a house key. It is stored encrypted, never in plain text, and you
          can replace it at any time from settings — which immediately stops the old one
          from working.
        </p>

        <Button size="lg" render={<Link href="/" />}>
          Go to your calendar
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
