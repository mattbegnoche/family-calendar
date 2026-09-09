"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/onboarding/ColorPicker";
import { FormError } from "@/components/onboarding/FormError";
import { IconPicker } from "@/components/onboarding/IconPicker";
import { MemberRows, type DraftMember } from "@/components/onboarding/MemberRows";
import { TimeZoneSelect } from "@/components/onboarding/TimeZoneSelect";
import { createFamilyAction } from "@/app/actions/onboarding";
import { IDLE_STATE } from "@/lib/action-state";
import {
  DEFAULT_HOUSEHOLD_COLOR,
  DEFAULT_HOUSEHOLD_ICON,
  HouseholdGlyph,
  householdTileGradient,
} from "@/lib/household-icons";
import {
  MAX_HOUSEHOLD_NAME_LENGTH,
  MAX_MEMBER_NAME_LENGTH,
  defaultColorForIndex,
} from "@/lib/members";

export interface CreateFamilyFormProps {
  /** From the Google profile, so the first field is usually already right. */
  defaultOwnerName: string;
}

const OWNER_COLOR_INDEX = 0;
const OTHER_MEMBER_COLOR_OFFSET = 1;

export function CreateFamilyForm({ defaultOwnerName }: CreateFamilyFormProps) {
  const [state, formAction, isPending] = useActionState(createFamilyAction, IDLE_STATE);

  const [familyName, setFamilyName] = useState("");
  const [color, setColor] = useState(DEFAULT_HOUSEHOLD_COLOR);
  const [icon, setIcon] = useState(DEFAULT_HOUSEHOLD_ICON);
  const [ownerColor, setOwnerColor] = useState(defaultColorForIndex(OWNER_COLOR_INDEX));
  const [members, setMembers] = useState<readonly DraftMember[]>([]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* What the sidebar tile will look like, updating as they choose. */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div
          className="flex aspect-square size-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
          style={{ backgroundImage: householdTileGradient(color) }}
        >
          <HouseholdGlyph iconKey={icon} className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{familyName || "Your family"}</p>
          <p className="text-xs text-muted-foreground">How it appears in the sidebar</p>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor="familyName">Family name</FieldLabel>
        <Input
          id="familyName"
          name="familyName"
          value={familyName}
          onChange={(event) => setFamilyName(event.target.value)}
          placeholder="The Rivera Family"
          maxLength={MAX_HOUSEHOLD_NAME_LENGTH}
          required
        />
      </Field>

      <Field>
        <FieldLabel>Colour and icon</FieldLabel>
        <ColorPicker value={color} onChange={setColor} name="color" label="Family colour" />
        <IconPicker
          value={icon}
          onChange={setIcon}
          color={color}
          name="icon"
          label="Family icon"
        />
        <FieldDescription>You can change these later in settings.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="timeZone">Time zone</FieldLabel>
        <TimeZoneSelect id="timeZone" name="timeZone" />
        <FieldDescription>
          Anchors all-day events, so &ldquo;all day Tuesday&rdquo; means the same thing on
          everyone&apos;s screen.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="ownerName">You on the calendar</FieldLabel>
        <Input
          id="ownerName"
          name="ownerName"
          defaultValue={defaultOwnerName}
          placeholder="Your name"
          maxLength={MAX_MEMBER_NAME_LENGTH}
          required
        />
        <ColorPicker
          value={ownerColor}
          onChange={setOwnerColor}
          name="ownerColor"
          label="Your calendar colour"
        />
      </Field>

      <Field>
        <FieldLabel>Everyone else</FieldLabel>
        <FieldDescription className="mb-1">
          Add your kids and anyone else who needs a column. They get their own calendar
          and tasks without needing a login — another adult can join later with the
          family code.
        </FieldDescription>
        <MemberRows
          members={members}
          onChange={setMembers}
          colorOffset={OTHER_MEMBER_COLOR_OFFSET}
        />
      </Field>

      <FormError message={state.error} />

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Creating your family…" : "Create family"}
      </Button>
    </form>
  );
}
