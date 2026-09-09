import { describe, expect, it } from "vitest";

import {
  GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE,
  GOOGLE_CALENDAR_LIST_READONLY_SCOPE,
  googleCalendarAuthorizationScope,
  hasGoogleCalendarScope,
} from "@/lib/google/scopes";

describe("hasGoogleCalendarScope", () => {
  it("is false for a plain sign-in grant", () => {
    expect(hasGoogleCalendarScope("openid email profile")).toBe(false);
    expect(hasGoogleCalendarScope(null)).toBe(false);
    expect(hasGoogleCalendarScope("")).toBe(false);
  });

  it("requires both calendar scopes", () => {
    expect(hasGoogleCalendarScope(`openid ${GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE}`)).toBe(false);
    expect(
      hasGoogleCalendarScope(
        `openid ${GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE} ${GOOGLE_CALENDAR_LIST_READONLY_SCOPE}`,
      ),
    ).toBe(true);
  });
});

describe("googleCalendarAuthorizationScope", () => {
  it("keeps openid so the connect flow still yields a profile", () => {
    const scope = googleCalendarAuthorizationScope();
    expect(scope.split(" ")).toEqual(
      expect.arrayContaining([
        "openid",
        "email",
        "profile",
        GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE,
        GOOGLE_CALENDAR_LIST_READONLY_SCOPE,
      ]),
    );
    expect(hasGoogleCalendarScope(scope)).toBe(true);
  });
});
