import { describe, expect, it } from "vitest";

import {
  GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_LIST_READONLY_SCOPE,
  googleCalendarAuthorizationScope,
  hasGoogleCalendarScope,
  hasGoogleCalendarWriteScope,
} from "@/lib/google/scopes";

const LIST = GOOGLE_CALENDAR_LIST_READONLY_SCOPE;

describe("hasGoogleCalendarScope", () => {
  it("is false for a plain sign-in grant", () => {
    expect(hasGoogleCalendarScope("openid email profile")).toBe(false);
    expect(hasGoogleCalendarScope(null)).toBe(false);
    expect(hasGoogleCalendarScope("")).toBe(false);
  });

  it("needs the calendar list plus either events scope", () => {
    expect(hasGoogleCalendarScope(`openid ${GOOGLE_CALENDAR_EVENTS_SCOPE}`)).toBe(false);
    expect(hasGoogleCalendarScope(`openid ${LIST}`)).toBe(false);
    expect(hasGoogleCalendarScope(`openid ${GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE} ${LIST}`)).toBe(true);
    expect(hasGoogleCalendarScope(`openid ${GOOGLE_CALENDAR_EVENTS_SCOPE} ${LIST}`)).toBe(true);
  });
});

describe("hasGoogleCalendarWriteScope", () => {
  it("is true only with the read-write events scope", () => {
    expect(hasGoogleCalendarWriteScope(`${GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE} ${LIST}`)).toBe(false);
    expect(hasGoogleCalendarWriteScope(`${GOOGLE_CALENDAR_EVENTS_SCOPE} ${LIST}`)).toBe(true);
    expect(hasGoogleCalendarWriteScope(null)).toBe(false);
  });
});

describe("googleCalendarAuthorizationScope", () => {
  it("keeps openid and asks for write access", () => {
    const scope = googleCalendarAuthorizationScope();
    expect(scope.split(" ")).toEqual(
      expect.arrayContaining(["openid", "email", "profile", GOOGLE_CALENDAR_EVENTS_SCOPE, LIST]),
    );
    expect(hasGoogleCalendarScope(scope)).toBe(true);
    expect(hasGoogleCalendarWriteScope(scope)).toBe(true);
  });
});
