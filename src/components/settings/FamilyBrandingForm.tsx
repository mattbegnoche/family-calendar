"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/onboarding/ColorPicker";
import { FormError } from "@/components/onboarding/FormError";
import { IconPicker } from "@/components/onboarding/IconPicker";
import { TimeZoneSelect } from "@/components/onboarding/TimeZoneSelect";
import { updateFamilyBrandingAction } from "@/app/actions/onboarding";
import { IDLE_STATE } from "@/lib/action-state";
import { HouseholdGlyph, householdTileGradient } from "@/lib/household-icons";
import { MAX_HOUSEHOLD_NAME_LENGTH } from "@/lib/members";


export interface FamilyBrandingFormProps {
  name: string;
  color: string;
  icon: string;
  timeZone: string;
}

/** Edits the sidebar tile at the top left, plus the household's time zone. */
export function FamilyBrandingForm({
  name: initialName,
  color: initialColor,
  icon: initialIcon,
  timeZone: initialTimeZone,
}: FamilyBrandingFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateFamilyBrandingAction,
    IDLE_STATE,
  );

  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(initialIcon);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div
          className="flex aspect-square size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ backgroundImage: householdTileGradient(color) }}
        >
          <HouseholdGlyph iconKey={icon} className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name || "Your family"}</p>
          <p className="text-xs text-muted-foreground">Shown at the top of the sidebar</p>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor="settings-family-name">Family name</FieldLabel>
        <Input
          id="settings-family-name"
          name="familyName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_HOUSEHOLD_NAME_LENGTH}
          required
        />
      </Field>

      <Field>
        <FieldLabel>Colour</FieldLabel>
        <ColorPicker value={color} onChange={setColor} name="color" label="Family colour" />
      </Field>

      <Field>
        <FieldLabel>Icon</FieldLabel>
        <IconPicker
          value={icon}
          onChange={setIcon}
          color={color}
          name="icon"
          label="Family icon"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="settings-time-zone">Time zone</FieldLabel>
        <TimeZoneSelect
          id="settings-time-zone"
          name="timeZone"
          defaultValue={initialTimeZone}
        />
        <FieldDescription>
          Changing this moves where all-day events start and end.
        </FieldDescription>
      </Field>

      <FormError message={state.error} />

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
