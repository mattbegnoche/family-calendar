import { describe, expect, it } from "vitest";

import { contrastingTextColor, familyThemeStyle, relativeLuminance } from "@/lib/family-theme";
import { DEFAULT_HOUSEHOLD_COLOR } from "@/lib/household-icons";

describe("relativeLuminance", () => {
  it("runs from black to white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });
});

describe("contrastingTextColor", () => {
  it("puts white text on the saturated palette colours", () => {
    expect(contrastingTextColor("#4f46e5")).toBe("#ffffff");
    expect(contrastingTextColor("#dc2626")).toBe("#ffffff");
    expect(contrastingTextColor("#16a34a")).toBe("#ffffff");
  });

  it("puts dark text on a light fill", () => {
    expect(contrastingTextColor("#fde047")).toBe("#0f172a");
    expect(contrastingTextColor("#ffffff")).toBe("#0f172a");
  });
});

describe("familyThemeStyle", () => {
  it("exposes the colour and its text colour as CSS variables", () => {
    expect(familyThemeStyle("#0891b2")).toEqual({
      "--family": "#0891b2",
      "--family-foreground": "#ffffff",
    });
  });

  it("falls back to the default colour for anything that is not 6-digit hex", () => {
    expect(familyThemeStyle("red")).toMatchObject({ "--family": DEFAULT_HOUSEHOLD_COLOR });
  });
});
