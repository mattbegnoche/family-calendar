"use client";

import { useActionState, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FamilyCodeDisplay } from "@/components/onboarding/FamilyCodeDisplay";
import { FormError } from "@/components/onboarding/FormError";
import { rotateFamilyCodeAction } from "@/app/actions/onboarding";
import { IDLE_STATE } from "@/lib/action-state";

export interface FamilyCodeCardProps {
  /** Null when the stored ciphertext cannot be decrypted — see readFamilyCode. */
  code: string | null;
}

export function FamilyCodeCard({ code }: FamilyCodeCardProps) {
  const [state, formAction, isPending] = useActionState(rotateFamilyCodeAction, IDLE_STATE);
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {code ? (
        <FamilyCodeDisplay code={code} initiallyHidden />
      ) : (
        <p className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            This family has no readable code yet. Generate one so the other adults can
            request to join.
          </span>
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Anyone with this code can ask to join, but they still need you to approve them.
        It is stored encrypted and never in plain text.
      </p>

      <FormError message={state.error} />

      {isConfirming ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm">
            Generate a new code? The current one stops working immediately, so anyone you
            have already sent it to will need the new one.
          </p>
          <div className="flex gap-2">
            <form action={formAction}>
              <Button type="submit" variant="destructive" size="sm" disabled={isPending}>
                {isPending ? "Generating…" : "Yes, replace it"}
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsConfirming(true)}
          className="self-start"
        >
          <RefreshCw className="size-4" />
          {code ? "Generate a new code" : "Generate a code"}
        </Button>
      )}
    </div>
  );
}
