import { describe, expect, it } from "vitest";

import {
  THEME_BOOT_SCRIPT,
  THEME_STORAGE_KEY,
  isThemePreference,
  nextThemePreference,
  resolveTheme,
} from "@/lib/theme";

describe("resolveTheme", () => {
  it("follows the OS when the preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("ignores the OS for an explicit choice", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("nextThemePreference", () => {
  it("cycles system, light, dark, system", () => {
    expect(nextThemePreference("system")).toBe("light");
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
  });
});

describe("isThemePreference", () => {
  it("accepts the three known values and nothing else", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe("THEME_BOOT_SCRIPT", () => {
  it("reads the same storage key the provider writes", () => {
    expect(THEME_BOOT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });

  it("is syntactically valid JavaScript", () => {
    expect(() => new Function(THEME_BOOT_SCRIPT)).not.toThrow();
  });
});
