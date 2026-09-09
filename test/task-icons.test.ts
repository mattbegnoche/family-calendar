import { describe, expect, it } from "vitest";

import {
  DEFAULT_TASK_ICON,
  TASK_ICONS,
  TASK_ICON_KEYS,
  isTaskIconKey,
  taskIcon,
} from "@/lib/task-icons";

describe("task icons", () => {
  it("has a default that is in the list", () => {
    expect(isTaskIconKey(DEFAULT_TASK_ICON)).toBe(true);
    expect(TASK_ICON_KEYS).toContain(DEFAULT_TASK_ICON);
  });

  it("maps every key to a component", () => {
    for (const key of TASK_ICON_KEYS) {
      expect(typeof TASK_ICONS[key]).not.toBe("undefined");
    }
  });

  it("falls back to the default for unknown keys, old emoji, and nothing", () => {
    const fallback = TASK_ICONS[DEFAULT_TASK_ICON];
    expect(taskIcon("🦷")).toBe(fallback);
    expect(taskIcon("not-an-icon")).toBe(fallback);
    expect(taskIcon(null)).toBe(fallback);
    expect(taskIcon(undefined)).toBe(fallback);
    expect(taskIcon("dog")).toBe(TASK_ICONS.dog);
  });

  it("never treats prototype names as icons", () => {
    expect(isTaskIconKey("constructor")).toBe(false);
    expect(isTaskIconKey("__proto__")).toBe(false);
  });
});
