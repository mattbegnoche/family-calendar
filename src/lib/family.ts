import type { Resource } from "calendarkit-pro";

/**
 * A person on the household calendar. Per the data model, a member is a name and
 * a color — it is not the same thing as a user account, so kids can have their
 * own column without an email address.
 */
export interface FamilyMember {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export const SHARED_MEMBER_ID = "everyone";

/**
 * Hues are spaced far apart on the color wheel so each person stays tellable
 * apart at a glance, and every value holds contrast against both the light and
 * the dark surface.
 *
 * Colors must stay 6-digit hex: CalendarKit builds an event's fill and border by
 * appending alpha suffixes directly to the string (`${color}15`, `${color}40`),
 * which silently yields an invalid color for any other notation.
 */
export const FAMILY_MEMBERS: readonly FamilyMember[] = [
  { id: SHARED_MEMBER_ID, label: "Everyone", color: "#4f46e5" },
  { id: "mom", label: "Mom", color: "#db2777" },
  { id: "dad", label: "Dad", color: "#0891b2" },
  { id: "lacy", label: "Lacy", color: "#7c3aed" },
  { id: "haven", label: "Haven", color: "#ea580c" },
] as const;

const FALLBACK_COLOR = FAMILY_MEMBERS[0].color;

const MEMBERS_BY_ID = new Map(
  FAMILY_MEMBERS.map((member) => [member.id, member]),
);

/** The list CalendarKit renders as toggleable calendars, one per member. */
export const FAMILY_CALENDARS = FAMILY_MEMBERS.map(({ id, label, color }) => ({
  id,
  label,
  color,
}));

export const FAMILY_RESOURCES: Resource[] = FAMILY_MEMBERS.map(
  ({ id, label, color }) => ({ id, label, color }),
);

export function findMember(memberId: string | undefined): FamilyMember | undefined {
  return memberId ? MEMBERS_BY_ID.get(memberId) : undefined;
}

/**
 * Event blocks render from `event.color` and fall back to the app's primary, so
 * an event with no color is indistinguishable from everyone else's. Every event
 * must carry the color of the member it belongs to.
 */
export function memberColor(memberId: string | undefined): string {
  return findMember(memberId)?.color ?? FALLBACK_COLOR;
}
