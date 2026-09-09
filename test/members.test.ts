import { describe, expect, test } from "vitest";

import {
  MAX_MEMBER_NAME_LENGTH,
  MEMBER_COLORS,
  SHARED_MEMBER_SLUG,
  defaultColorForIndex,
  isHexColor,
  slugifyMemberName,
  uniqueMemberSlug,
  validateMemberName,
} from "@/lib/members";

describe("slugifyMemberName", () => {
  test("lower-cases and hyphenates ordinary names", () => {
    expect(slugifyMemberName("Mom")).toBe("mom");
    expect(slugifyMemberName("Aunt Jo!")).toBe("aunt-jo");
    expect(slugifyMemberName("  Mary   Anne  ")).toBe("mary-anne");
  });

  test("strips accents rather than dropping the letters", () => {
    expect(slugifyMemberName("Renée")).toBe("renee");
    expect(slugifyMemberName("José")).toBe("jose");
  });

  test("returns an empty string when nothing survives", () => {
    // Callers must handle this; uniqueMemberSlug substitutes a fallback.
    expect(slugifyMemberName("!!!")).toBe("");
    expect(slugifyMemberName("さくら")).toBe("");
  });

  test("never ends in a hyphen, even when truncated at the length limit", () => {
    const slug = slugifyMemberName(`${"a".repeat(39)} bcdefgh`);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("uniqueMemberSlug", () => {
  test("returns the plain slug when it is free", () => {
    expect(uniqueMemberSlug("Sam", new Set())).toBe("sam");
  });

  test("suffixes rather than colliding with a taken slug", () => {
    // Arrange
    const taken = new Set([SHARED_MEMBER_SLUG, "sam"]);

    // Act
    const slug = uniqueMemberSlug("Sam", taken);

    // Assert
    expect(slug).toBe("sam-2");
    expect(taken.has(slug)).toBe(false);
  });

  test("keeps counting past several collisions", () => {
    const taken = new Set(["sam", "sam-2", "sam-3"]);
    expect(uniqueMemberSlug("Sam", taken)).toBe("sam-4");
  });

  test("falls back to a valid slug for a name with no Latin characters", () => {
    // A household written entirely in another script must still get usable keys.
    const slug = uniqueMemberSlug("さくら", new Set());
    expect(slug).toBe("member");
    expect(uniqueMemberSlug("ひかり", new Set([slug]))).toBe("member-2");
  });

  test("never returns the reserved shared slug", () => {
    // "Everyone" as a person's name must not collide with the SHARED row,
    // which @@unique([householdId, slug]) would reject.
    expect(uniqueMemberSlug("Everyone", new Set([SHARED_MEMBER_SLUG]))).not.toBe(
      SHARED_MEMBER_SLUG,
    );
  });
});

describe("validateMemberName", () => {
  test("trims and accepts a reasonable name", () => {
    expect(validateMemberName("  Ava  ")).toBe("Ava");
  });

  test("rejects blank and over-long names", () => {
    expect(validateMemberName("")).toBeNull();
    expect(validateMemberName("   ")).toBeNull();
    expect(validateMemberName("a".repeat(MAX_MEMBER_NAME_LENGTH + 1))).toBeNull();
  });

  test("accepts a name exactly at the limit", () => {
    const name = "a".repeat(MAX_MEMBER_NAME_LENGTH);
    expect(validateMemberName(name)).toBe(name);
  });
});

describe("colours", () => {
  test("every palette entry is 6-digit hex, as the database CHECK requires", () => {
    for (const color of MEMBER_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
      expect(isHexColor(color)).toBe(true);
    }
  });

  test("isHexColor rejects shorthand, named and malformed colours", () => {
    // event-colors.ts concatenates onto this value, so anything else would
    // silently produce invalid CSS.
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#4f46e5ff")).toBe(false);
    expect(isHexColor("")).toBe(false);
  });

  test("defaultColorForIndex cycles instead of running off the end", () => {
    expect(defaultColorForIndex(0)).toBe(MEMBER_COLORS[0]);
    expect(defaultColorForIndex(MEMBER_COLORS.length)).toBe(MEMBER_COLORS[0]);
    expect(defaultColorForIndex(MEMBER_COLORS.length + 3)).toBe(MEMBER_COLORS[3]);
  });
});
