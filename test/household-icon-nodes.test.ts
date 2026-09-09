import { describe, expect, test } from "vitest";

import { HOUSEHOLD_ICON_NODES } from "@/lib/household-icon-nodes";
import {
  DEFAULT_HOUSEHOLD_ICON,
  HOUSEHOLD_ICONS,
  HOUSEHOLD_ICON_KEYS,
} from "@/lib/household-icons";

/**
 * The icons exist twice: as React components for the sidebar, and as raw SVG
 * node data for the generated favicon, because lucide-react's shared Icon
 * module is "use client" and cannot be invoked while rendering the favicon on
 * the server.
 *
 * Two lists can drift. These tests are what stops a household picking an icon
 * in settings and getting the default in its browser tab with nothing to
 * explain why.
 */
describe("the favicon icon data", () => {
  test("covers exactly the same keys as the component allow-list", () => {
    expect(Object.keys(HOUSEHOLD_ICON_NODES).sort()).toEqual(
      Object.keys(HOUSEHOLD_ICONS).sort(),
    );
  });

  test("includes the default, which is the fallback for unknown keys", () => {
    expect(Object.hasOwn(HOUSEHOLD_ICON_NODES, DEFAULT_HOUSEHOLD_ICON)).toBe(true);
  });

  test("gives every icon at least one drawable element", () => {
    for (const key of HOUSEHOLD_ICON_KEYS) {
      const node = HOUSEHOLD_ICON_NODES[key];
      expect(node.length, `${key} has no nodes`).toBeGreaterThan(0);
      for (const [tag, attributes] of node) {
        expect(typeof tag, `${key} has a non-string tag`).toBe("string");
        expect(attributes, `${key} has an element with no attributes`).toBeTypeOf(
          "object",
        );
      }
    }
  });

  test("resolves aliases to real geometry rather than an empty module", () => {
    // `smile` is an alias module in lucide-react: it re-exports another icon
    // and carries no __iconNode of its own, so importing it directly yields
    // undefined and the tab would silently lose its glyph.
    expect(HOUSEHOLD_ICON_NODES.smile).toBeDefined();
    expect(HOUSEHOLD_ICON_NODES.smile.length).toBeGreaterThan(0);
  });
});
