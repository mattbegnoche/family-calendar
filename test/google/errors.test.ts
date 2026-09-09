import { describe, expect, it } from "vitest";

import {
  GoogleApiError,
  GoogleTokenError,
  RECONNECT_HINT,
  describeGoogleFailure,
} from "@/lib/google/errors";

describe("describeGoogleFailure", () => {
  it("tells the user to reconnect when the grant is gone", () => {
    expect(describeGoogleFailure(new GoogleTokenError("revoked"))).toContain(RECONNECT_HINT);
    expect(describeGoogleFailure(new GoogleApiError(401, "events.list", "{}"))).toContain(
      RECONNECT_HINT,
    );
  });

  it("explains a 403 as a setup or sharing problem", () => {
    expect(describeGoogleFailure(new GoogleApiError(403, "events.list", "{}"))).toMatch(
      /Calendar API/,
    );
  });

  it("names a missing calendar and a rate limit", () => {
    expect(describeGoogleFailure(new GoogleApiError(404, "events.list", "{}"))).toMatch(
      /no longer exists/,
    );
    expect(describeGoogleFailure(new GoogleApiError(429, "events.list", "{}"))).toMatch(
      /rate-limiting/,
    );
  });

  it("falls back to a generic line for anything else", () => {
    expect(describeGoogleFailure(new GoogleApiError(500, "events.list", "{}"))).toBe(
      "Google Calendar returned an error.",
    );
    expect(describeGoogleFailure(new TypeError("fetch failed"))).toBe(
      "Could not reach Google Calendar.",
    );
  });
});

describe("GoogleApiError", () => {
  it("truncates Google's response body in the message", () => {
    const error = new GoogleApiError(500, "events.list", "x".repeat(1000));
    expect(error.message.length).toBeLessThan(400);
    expect(error.status).toBe(500);
  });
});
