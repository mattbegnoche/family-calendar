import { describe, expect, it } from "vitest";

import { EDITABILITY_NOTE, googleEditability } from "@/lib/google/editability";
import {
  GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
  GOOGLE_CALENDAR_LIST_READONLY_SCOPE,
} from "@/lib/google/scopes";

const WRITE = `${GOOGLE_CALENDAR_EVENTS_SCOPE} ${GOOGLE_CALENDAR_LIST_READONLY_SCOPE}`;
const READ = `${GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE} ${GOOGLE_CALENDAR_LIST_READONLY_SCOPE}`;

describe("googleEditability", () => {
  it("lets the account's owner edit once the write scope is granted", () => {
    expect(googleEditability({ userId: "u1", scope: WRITE }, "u1")).toBe("editable");
  });

  it("keeps everyone else read-only, whatever the scope", () => {
    expect(googleEditability({ userId: "u1", scope: WRITE }, "u2")).toBe("not-owner");
  });

  it("asks the owner to reconnect when only the read scope was granted", () => {
    expect(googleEditability({ userId: "u1", scope: READ }, "u1")).toBe("needs-reconnect");
    expect(googleEditability({ userId: "u1", scope: null }, "u1")).toBe("needs-reconnect");
  });

  it("has a note for every read-only case", () => {
    expect(EDITABILITY_NOTE["not-owner"]).toMatch(/connected this calendar/);
    expect(EDITABILITY_NOTE["needs-reconnect"]).toMatch(/Reconnect/);
  });
});
