import { createElement } from "react";
import {
  Cake,
  Calendar,
  Heart,
  House,
  Moon,
  Mountain,
  PawPrint,
  Rocket,
  Sailboat,
  Smile,
  Sparkles,
  Star,
  Sun,
  Tent,
  TreePine,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The icons a household may pick for its sidebar tile.
 *
 * An allow-list rather than a free-text component name. `Household.icon` holds
 * one of these keys, and rendering goes through `householdIcon()`, so a value
 * that arrives from the database — or from a hand-crafted form POST — can only
 * ever resolve to something in this map or to the fallback. Nothing user-typed
 * reaches the renderer.
 */
export const HOUSEHOLD_ICONS: Readonly<Record<string, LucideIcon>> = {
  calendar: Calendar,
  house: House,
  heart: Heart,
  star: Star,
  sun: Sun,
  moon: Moon,
  "tree-pine": TreePine,
  "paw-print": PawPrint,
  rocket: Rocket,
  sailboat: Sailboat,
  tent: Tent,
  mountain: Mountain,
  sparkles: Sparkles,
  smile: Smile,
  users: Users,
  cake: Cake,
};

export const DEFAULT_HOUSEHOLD_ICON = "calendar";
export const DEFAULT_HOUSEHOLD_COLOR = "#4f46e5";

export const HOUSEHOLD_ICON_KEYS: readonly string[] = Object.keys(HOUSEHOLD_ICONS);

export function isHouseholdIconKey(value: string): boolean {
  return Object.hasOwn(HOUSEHOLD_ICONS, value);
}

/**
 * Never throws: an unknown key renders the default rather than crashing.
 *
 * Goes through isHouseholdIconKey rather than `HOUSEHOLD_ICONS[key] ?? default`.
 * Plain bracket access walks the prototype chain, so a stored value of
 * "constructor" or "toString" resolves to an inherited function instead of
 * undefined — the `??` never fires and React is handed something that is not a
 * component. Household.icon is a plain text column, so that value can arrive
 * from an old row or a hand-crafted form POST.
 */
export function householdIcon(key: string): LucideIcon {
  return isHouseholdIconKey(key)
    ? HOUSEHOLD_ICONS[key]
    : HOUSEHOLD_ICONS[DEFAULT_HOUSEHOLD_ICON];
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** How much of the base colour survives in the gradient's darker stop. */
const TILE_SHADE_WEIGHT = 0.65;

const HEX_RADIX = 16;
const HEX_PAIR_LENGTH = 2;

function shadeTowardBlack(color: string, weight: number): string {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(color.slice(offset, offset + HEX_PAIR_LENGTH), HEX_RADIX),
  );
  return `#${channels
    .map((channel) =>
      Math.round(channel * weight)
        .toString(HEX_RADIX)
        .padStart(HEX_PAIR_LENGTH, "0"),
    )
    .join("")}`;
}

/**
 * The two stops of a household's tile, as concrete 6-digit hex.
 *
 * Computed rather than expressed as CSS `color-mix()` so the same pair can be
 * used outside a browser — the generated favicon is an SVG built on the server,
 * where `color-mix()` would not resolve. One source of truth keeps the tab icon
 * and the sidebar tile identical.
 */
export function householdTileStops(color: string): readonly [string, string] {
  const base = HEX_COLOR.test(color) ? color : DEFAULT_HOUSEHOLD_COLOR;
  return [base, shadeTowardBlack(base, TILE_SHADE_WEIGHT)];
}

/**
 * The sidebar tile's fill. Keeps the depth of the original hardcoded
 * indigo-to-violet ramp while letting the household choose the hue: the second
 * stop is the same colour darkened, so any hex produces a coherent gradient
 * without a second colour to pick.
 */
export function householdTileGradient(color: string): string {
  const [from, to] = householdTileStops(color);
  return `linear-gradient(to bottom right, ${from}, ${to})`;
}

export interface HouseholdGlyphProps {
  iconKey: string;
  className?: string;
}

/**
 * Renders a household's chosen icon.
 *
 * Uses createElement rather than the more obvious
 * `const Icon = householdIcon(key)` followed by `<Icon />`: assigning a
 * component to a variable during render gives it a fresh identity on every
 * pass, which remounts the subtree and discards its state. Looking the
 * component up and creating the element in one expression has no such variable.
 */
export function HouseholdGlyph({ iconKey, className }: HouseholdGlyphProps) {
  return createElement(householdIcon(iconKey), { className });
}
