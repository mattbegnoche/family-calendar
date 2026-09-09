import { randomBytes } from "node:crypto";
import { describe, expect, test, vi } from "vitest";

// The module derives its keys from the environment on first use and caches
// them, so the secret must exist before it is imported.
process.env.FAMILY_CODE_SECRET = randomBytes(32).toString("base64");

const {
  assertFamilyCodeSecret,
  decryptFamilyCode,
  encryptFamilyCode,
  familyCodeIndex,
  formatFamilyCode,
  generateFamilyCode,
  mintFamilyCode,
  normalizeFamilyCode,
} = await import("@/lib/family-code");

/**
 * A fresh copy of the module, re-reading FAMILY_CODE_SECRET from the
 * environment. The module caches its derived keys after first use, so testing
 * a different secret means resetting the registry rather than re-calling into
 * the instance imported above.
 */
async function reloadWithCurrentSecret() {
  vi.resetModules();
  return import("@/lib/family-code");
}

/** Crockford Base32: no I, L, O or U. */
const CANONICAL = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$/;

describe("generateFamilyCode", () => {
  test("produces a 10-character code from the unambiguous alphabet", () => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      expect(generateFamilyCode()).toMatch(CANONICAL);
    }
  });

  test("does not repeat itself across many draws", () => {
    const draws = new Set(Array.from({ length: 500 }, generateFamilyCode));
    expect(draws.size).toBe(500);
  });
});

describe("normalizeFamilyCode", () => {
  test("accepts the formatted, lower-cased and padded forms of a code", () => {
    // Arrange
    const code = generateFamilyCode();
    const formatted = formatFamilyCode(code);

    // Act & Assert
    expect(normalizeFamilyCode(formatted)).toBe(code);
    expect(normalizeFamilyCode(formatted.toLowerCase())).toBe(code);
    expect(normalizeFamilyCode(`  ${formatted}  `)).toBe(code);
    expect(normalizeFamilyCode(code)).toBe(code);
  });

  test("applies Crockford confusion rules so misread characters still resolve", () => {
    // O reads as 0, I and L read as 1 — the cases someone copying a code off a
    // screen actually gets wrong.
    expect(normalizeFamilyCode("OOOOO-OOOOO")).toBe("0000000000");
    expect(normalizeFamilyCode("IIIII-LLLLL")).toBe("1111111111");
  });

  test("returns null rather than throwing for unusable input", () => {
    expect(normalizeFamilyCode("")).toBeNull();
    expect(normalizeFamilyCode("TOO-SHORT")).toBeNull();
    expect(normalizeFamilyCode("ABCDEFGHIJKLMNOP")).toBeNull();
    expect(normalizeFamilyCode("!!!!!-!!!!!")).toBeNull();
  });
});

describe("formatFamilyCode", () => {
  test("groups a code as XXXXX-XXXXX", () => {
    expect(formatFamilyCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
  });
});

describe("familyCodeIndex", () => {
  test("is deterministic across every accepted spelling of one code", () => {
    const code = generateFamilyCode();
    const expected = familyCodeIndex(code);

    expect(familyCodeIndex(formatFamilyCode(code))).toBe(expected);
    expect(familyCodeIndex(formatFamilyCode(code).toLowerCase())).toBe(expected);
  });

  test("differs between codes and is a 64-character hex digest", () => {
    const first = familyCodeIndex(generateFamilyCode());
    const second = familyCodeIndex(generateFamilyCode());

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
  });

  test("never equals the placeholder the migration writes for legacy rows", () => {
    // The migration backfills 'unset:' || id, which must be unreachable by any
    // code someone could type. Length alone guarantees it.
    expect(familyCodeIndex(generateFamilyCode())).not.toMatch(/^unset:/);
  });

  test("throws on a code it cannot normalise", () => {
    expect(() => familyCodeIndex("nope")).toThrow();
  });
});

describe("encryptFamilyCode / decryptFamilyCode", () => {
  test("round-trips a code", () => {
    const code = generateFamilyCode();
    expect(decryptFamilyCode(encryptFamilyCode(code))).toBe(code);
  });

  test("produces different ciphertext each time for the same code", () => {
    // A deterministic ciphertext would leak that two households share a code.
    const code = generateFamilyCode();
    expect(encryptFamilyCode(code)).not.toBe(encryptFamilyCode(code));
  });

  test("never contains the plaintext code", () => {
    const code = generateFamilyCode();
    expect(encryptFamilyCode(code)).not.toContain(code);
  });

  test("rejects a tampered ciphertext instead of returning a wrong code", () => {
    // Arrange
    const stored = encryptFamilyCode(generateFamilyCode());
    const payload = Buffer.from(stored.slice("v1.".length), "base64");
    payload[payload.length - 1] ^= 0xff;
    const tampered = `v1.${payload.toString("base64")}`;

    // Act & Assert
    expect(() => decryptFamilyCode(tampered)).toThrow();
  });

  test("rejects an unknown scheme, a truncated payload and a malformed value", () => {
    const stored = encryptFamilyCode(generateFamilyCode());

    expect(() => decryptFamilyCode(`v2.${stored.slice(3)}`)).toThrow(/scheme/i);
    expect(() => decryptFamilyCode("v1.AAAA")).toThrow(/truncated/i);
    expect(() => decryptFamilyCode("no-separator")).toThrow(/malformed/i);
  });

  test("cannot be decrypted under a different secret", async () => {
    // Arrange: a second module instance with its own key material.
    const stored = encryptFamilyCode(generateFamilyCode());
    process.env.FAMILY_CODE_SECRET = randomBytes(32).toString("base64");
    const other = await reloadWithCurrentSecret();

    // Act & Assert: this is the FAMILY_CODE_SECRET-rotation case that
    // readFamilyCode turns into a "generate a new code" prompt.
    expect(() => other.decryptFamilyCode(stored)).toThrow();
  });
});

describe("mintFamilyCode", () => {
  test("returns a code with a matching index and a decryptable ciphertext", () => {
    const record = mintFamilyCode();

    expect(record.code).toMatch(CANONICAL);
    expect(record.codeIndex).toBe(familyCodeIndex(record.code));
    expect(decryptFamilyCode(record.codeCiphertext)).toBe(record.code);
  });
});

describe("assertFamilyCodeSecret", () => {
  test("rejects a missing or too-short secret with an actionable message", async () => {
    const saved = process.env.FAMILY_CODE_SECRET;

    delete process.env.FAMILY_CODE_SECRET;
    const missing = await reloadWithCurrentSecret();
    expect(() => missing.assertFamilyCodeSecret()).toThrow(/openssl rand -base64 32/);

    process.env.FAMILY_CODE_SECRET = Buffer.from("too-short").toString("base64");
    const short = await reloadWithCurrentSecret();
    expect(() => short.assertFamilyCodeSecret()).toThrow(/at least 32 bytes/);

    process.env.FAMILY_CODE_SECRET = saved;
  });

  test("passes with a valid secret", () => {
    expect(() => assertFamilyCodeSecret()).not.toThrow();
  });
});
