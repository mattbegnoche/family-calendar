"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/onboarding/ColorPicker";
import { defaultColorForIndex, MAX_MEMBER_NAME_LENGTH } from "@/lib/members";

export interface DraftMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface MemberRowsProps {
  members: readonly DraftMember[];
  onChange: (members: readonly DraftMember[]) => void;
  /** Offset into the palette so these rows do not repeat the owner's colour. */
  colorOffset: number;
}

/**
 * The children-and-everyone-else section of onboarding.
 *
 * These rows become Members with no linked User: a child gets a calendar column
 * and can be assigned tasks without ever having an email address or a login,
 * which is the whole reason Member and User are separate models.
 *
 * Every update returns a new array rather than mutating in place — React needs
 * a new reference to re-render, and the rest of this codebase holds the same
 * rule.
 */
export function MemberRows({ members, onChange, colorOffset }: MemberRowsProps) {
  const updateMember = (id: string, patch: Partial<Omit<DraftMember, "id">>) => {
    onChange(
      members.map((member) => (member.id === id ? { ...member, ...patch } : member)),
    );
  };

  const addMember = () => {
    onChange([
      ...members,
      {
        // Only ever called from a click, so this never runs during SSR and
        // cannot cause a hydration mismatch.
        id: crypto.randomUUID(),
        name: "",
        color: defaultColorForIndex(colorOffset + members.length),
      },
    ]);
  };

  const removeMember = (id: string) => {
    onChange(members.filter((member) => member.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      {members.map((member, index) => (
        <div key={member.id} className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: member.color }}
              aria-hidden
            />
            <Input
              name="memberName"
              value={member.name}
              onChange={(event) => updateMember(member.id, { name: event.target.value })}
              placeholder={index === 0 ? "e.g. Ava" : "Another name"}
              maxLength={MAX_MEMBER_NAME_LENGTH}
              aria-label={`Name of family member ${index + 1}`}
              className="h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeMember(member.id)}
              aria-label={`Remove family member ${index + 1}`}
              className="size-9 shrink-0 text-muted-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
          <ColorPicker
            className="mt-2.5 pl-5"
            value={member.color}
            onChange={(color) => updateMember(member.id, { color })}
            name="memberColor"
            label={`Colour for family member ${index + 1}`}
          />
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addMember} className="self-start">
        <Plus className="size-4" />
        Add someone
      </Button>
    </div>
  );
}
