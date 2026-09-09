"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/onboarding/FormError";
import {
  approveJoinRequestAction,
  denyJoinRequestAction,
} from "@/app/actions/onboarding";
import { IDLE_STATE } from "@/lib/action-state";

export interface JoinRequestView {
  id: string;
  requestedName: string;
  requestedColor: string;
  applicantName: string | null;
  applicantEmail: string;
  applicantImage: string | null;
}

const AVATAR_PIXELS = 36;

function JoinRequestRow({ request }: { request: JoinRequestView }) {
  // Two hooks rather than one: approve and deny are separate server actions,
  // and each form needs its own pending state so only the button that was
  // pressed shows progress.
  const [approveState, approve, isApproving] = useActionState(
    approveJoinRequestAction,
    IDLE_STATE,
  );
  const [denyState, deny, isDenying] = useActionState(denyJoinRequestAction, IDLE_STATE);
  const isBusy = isApproving || isDenying;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        {request.applicantImage ? (
          <Image
            src={request.applicantImage}
            alt=""
            width={AVATAR_PIXELS}
            height={AVATAR_PIXELS}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {(request.applicantName ?? request.applicantEmail)[0]?.toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {request.applicantName ?? request.applicantEmail}
          </p>
          {/* The email is what actually identifies them — the display name is
              whatever they typed, so it must not be the only thing shown. */}
          <p className="truncate text-xs text-muted-foreground">
            {request.applicantEmail}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: request.requestedColor }}
            aria-hidden
          />
          {request.requestedName}
        </span>
      </div>

      <FormError message={approveState.error ?? denyState.error} />

      <div className="flex gap-2">
        <form action={approve}>
          <input type="hidden" name="requestId" value={request.id} />
          <Button type="submit" size="sm" disabled={isBusy}>
            <Check className="size-4" />
            {isApproving ? "Approving…" : "Approve"}
          </Button>
        </form>
        <form action={deny}>
          <input type="hidden" name="requestId" value={request.id} />
          <Button type="submit" variant="ghost" size="sm" disabled={isBusy}>
            <X className="size-4" />
            {isDenying ? "Declining…" : "Decline"}
          </Button>
        </form>
      </div>
    </li>
  );
}

export function JoinRequestList({ requests }: { requests: readonly JoinRequestView[] }) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No one is waiting to join right now.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <JoinRequestRow key={request.id} request={request} />
      ))}
    </ul>
  );
}
