import { describe, expect, it } from "vitest";

import {
  GOOGLE_EVENT_READ_ONLY_MESSAGE,
  googleEventId,
  isGoogleEventId,
  localEventId,
  parseGoogleEventId,
  parseLocalEventId,
  pendingEventId,
  readOnlyReason,
  taskEventId,
} from "@/lib/calendar-ids";

describe("parseLocalEventId", () => {
  it("returns the row id behind a local event id", () => {
    expect(parseLocalEventId(localEventId("abc"))).toBe("abc");
  });

  it("returns null for anything not stored locally", () => {
    expect(parseLocalEventId(taskEventId("t1"))).toBeNull();
    expect(parseLocalEventId(googleEventId("c1", "g1"))).toBeNull();
    expect(parseLocalEventId(pendingEventId("p1"))).toBeNull();
    expect(parseLocalEventId("abc")).toBeNull();
  });
});

describe("googleEventId", () => {
  it("keeps the same Google event distinct across two connections", () => {
    expect(googleEventId("c1", "g1")).not.toBe(googleEventId("c2", "g1"));
    expect(isGoogleEventId(googleEventId("c1", "g1"))).toBe(true);
    expect(isGoogleEventId(localEventId("g1"))).toBe(false);
  });
});

describe("parseGoogleEventId", () => {
  it("splits a Google id back into its connection and event", () => {
    expect(parseGoogleEventId(googleEventId("cm1abc", "ev_20260910T120000Z"))).toEqual({
      connectionId: "cm1abc",
      googleId: "ev_20260910T120000Z",
    });
  });

  it("returns null for other kinds and for malformed ids", () => {
    expect(parseGoogleEventId(localEventId("abc"))).toBeNull();
    expect(parseGoogleEventId("google-nodash")).toBeNull();
    expect(parseGoogleEventId("google-cm1abc-")).toBeNull();
  });
});

describe("readOnlyReason", () => {
  it("allows local events", () => {
    expect(readOnlyReason(localEventId("abc"))).toBeNull();
  });

  it("names Google Calendar for imported events", () => {
    expect(readOnlyReason(googleEventId("c1", "g1"))).toBe(GOOGLE_EVENT_READ_ONLY_MESSAGE);
  });

  it("points tasks at the tasks page", () => {
    expect(readOnlyReason(taskEventId("t1"))).toMatch(/Tasks page/);
  });

  it("asks for patience while a save is in flight", () => {
    expect(readOnlyReason(pendingEventId("p1"))).toMatch(/still saving/);
  });

  it("falls back to a generic message for an unknown id", () => {
    expect(readOnlyReason("mystery")).toMatch(/can't be edited/);
  });
});
