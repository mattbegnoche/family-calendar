import { describe, expect, test } from "vitest";

import {
  DEFAULT_HOUSEHOLD_COLOR,
  DEFAULT_HOUSEHOLD_ICON,
  HOUSEHOLD_ICONS,
  HOUSEHOLD_ICON_KEYS,
  householdIcon,
  householdTileGradient,
  isHouseholdIconKey,
} from "@/lib/household-icons";

describe("the icon allow-list", () => {
  test("resolves every advertised key to a component", () => {
    for (const key of HOUSEHOLD_ICON_KEYS) {
      expect(isHouseholdIconKey(key)).toBe(true);
      expect(householdIcon(key)).toBe(HOUSEHOLD_ICONS[key]);
    }
  });

  test("includes its own default", () => {
    expect(isHouseholdIconKey(DEFAULT_HOUSEHOLD_ICON)).toBe(true);
  });

  test("falls back instead of throwing on a value from outside the list", () => {
    // Household.icon is a plain string column, so an unexpected value can
    // reach the renderer from an old row or a hand-crafted POST.
    const fallback = HOUSEHOLD_ICONS[DEFAULT_HOUSEHOLD_ICON];
    expect(householdIcon("not-an-icon")).toBe(fallback);
    expect(householdIcon("")).toBe(fallback);
  });

  test("rejects inherited Object properties as keys", () => {
    // Object.hasOwn, not `key in map`: otherwise "constructor" and "toString"
    // would validate and then resolve to something that is not a component.
    expect(isHouseholdIconKey("constructor")).toBe(false);
    expect(isHouseholdIconKey("toString")).toBe(false);
    expect(householdIcon("constructor")).toBe(HOUSEHOLD_ICONS[DEFAULT_HOUSEHOLD_ICON]);
  });
});

describe("householdTileGradient", () => {
  test("builds a gradient that carries the household colour", () => {
    expect(householdTileGradient("#4f46e5")).toContain("#4f46e5");
    expect(householdTileGradient("#4f46e5")).toMatch(/^linear-gradient\(/);
  });

  test("the default colour is valid 6-digit hex", () => {
    expect(DEFAULT_HOUSEHOLD_COLOR).toMatch(/^#[0-9a-f]{6}$/);
  });
});
