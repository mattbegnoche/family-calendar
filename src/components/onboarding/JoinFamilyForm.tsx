"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/onboarding/ColorPicker";
import { FormError } from "@/components/onboarding/FormError";
import { joinFamilyAction } from "@/app/actions/onboarding";
import { IDLE_STATE } from "@/lib/action-state";
import { MAX_MEMBER_NAME_LENGTH, defaultColorForIndex } from "@/lib/members";

export interface JoinFamilyFormProps {
  defaultName: string;
}

/** XXXXX-XXXXX plus room for the separator. */
const CODE_INPUT_MAX_LENGTH = 11;

/**
 * Upper-cases and re-groups as they type, so a code pasted in any shape ends up
 * looking like the one they were sent. Purely cosmetic — the server normalises
 * independently, and accepts the code with or without the dash.
 */
function formatCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
}

export function JoinFamilyForm({ defaultName }: JoinFamilyFormProps) {
  const [state, formAction, isPending] = useActionState(joinFamilyAction, IDLE_STATE);
  const [code, setCode] = useState("");
  const [color, setColor] = useState(defaultColorForIndex(2));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field>
        <FieldLabel htmlFor="code">Family code</FieldLabel>
        <Input
          id="code"
          name="code"
          value={code}
          onChange={(event) => setCode(formatCodeInput(event.target.value))}
          placeholder="A1B2C-D3E4F"
          maxLength={CODE_INPUT_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono text-lg tracking-[0.2em]"
          required
        />
        <FieldDescription>
          Ask whoever set up your family for their code. It is secret — treat it like a
          house key.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="name">You on the calendar</FieldLabel>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          placeholder="Your name"
          maxLength={MAX_MEMBER_NAME_LENGTH}
          required
        />
        <ColorPicker
          value={color}
          onChange={setColor}
          name="color"
          label="Your calendar colour"
        />
        <FieldDescription>
          An owner picks who gets in, so this is a request until they approve it.
        </FieldDescription>
      </Field>

      <FormError message={state.error} />

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Sending request…" : "Request to join"}
      </Button>
    </form>
  );
}
