import { describe, expect, it } from "vitest";

import { isAccessTokenFresh } from "@/lib/google/token-expiry";

const NOW = 1_800_000_000;

describe("isAccessTokenFresh", () => {
  it("is false when no expiry was recorded", () => {
    expect(isAccessTokenFresh(null, NOW)).toBe(false);
    expect(isAccessTokenFresh(undefined, NOW)).toBe(false);
  });

  it("is true with comfortable time left", () => {
    expect(isAccessTokenFresh(NOW + 3600, NOW)).toBe(true);
  });

  it("refreshes early rather than expiring mid-request", () => {
    expect(isAccessTokenFresh(NOW + 30, NOW)).toBe(false);
    expect(isAccessTokenFresh(NOW - 10, NOW)).toBe(false);
  });
});
