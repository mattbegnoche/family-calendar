import { describe, expect, it } from "vitest";

import { googleEventId } from "@/lib/calendar-ids";
import { toCalendarEvent, toCalendarEvents, type ImportTarget } from "@/lib/google/to-calendar-events";
import type { GoogleEvent } from "@/lib/google/types";

const target: ImportTarget = {
  connectionId: "conn1",
  calendarName: "Family",
  member: { slug: "mom", color: "#0891b2" },
  timeZone: "America/Chicago",
  editability: "not-owner",
};

const timed: GoogleEvent = {
  id: "g1",
  summary: " Dentist ",
  description: "Bring the forms",
  location: "Main St",
  htmlLink: "https://calendar.google.com/event?eid=g1",
  start: { dateTime: "2026-09-10T14:00:00-05:00" },
  end: { dateTime: "2026-09-10T15:00:00-05:00" },
};

describe("toCalendarEvent", () => {
  it("maps a timed event onto the member's column, read-only", () => {
    const event = toCalendarEvent(timed, target);

    expect(event).toMatchObject({
      id: googleEventId("conn1", "g1"),
      title: "Dentist",
      description: "Bring the forms",
      location: "Main St",
      allDay: false,
      calendarId: "mom",
      color: "#0891b2",
      source: "google",
      sourceLabel: "Family",
      htmlLink: timed.htmlLink,
      readOnly: true,
      readOnlyNote: expect.stringMatching(/connected this calendar/),
    });
    expect(event?.start.toISOString()).toBe("2026-09-10T19:00:00.000Z");
    expect(event?.end.toISOString()).toBe("2026-09-10T20:00:00.000Z");
  });

  it("anchors a one-day all-day event at household midnight with start equal to end", () => {
    const event = toCalendarEvent(
      { id: "g2", summary: "Holiday", start: { date: "2026-09-04" }, end: { date: "2026-09-05" } },
      target,
    );

    expect(event?.allDay).toBe(true);
    expect(event?.start.toISOString()).toBe("2026-09-04T05:00:00.000Z");
    expect(event?.end.toISOString()).toBe("2026-09-04T05:00:00.000Z");
  });

  it("steps Google's exclusive all-day end back to the last day", () => {
    const event = toCalendarEvent(
      { id: "g3", summary: "Trip", start: { date: "2026-09-04" }, end: { date: "2026-09-07" } },
      target,
    );

    expect(event?.end.toISOString()).toBe("2026-09-06T05:00:00.000Z");
  });

  it("steps back a whole calendar day even across the clock change", () => {
    const event = toCalendarEvent(
      { id: "g4", summary: "Weekend", start: { date: "2026-03-07" }, end: { date: "2026-03-09" } },
      target,
    );

    // 8 March 2026 is the spring-forward day; midnight that day is still CST.
    expect(event?.start.toISOString()).toBe("2026-03-07T06:00:00.000Z");
    expect(event?.end.toISOString()).toBe("2026-03-08T06:00:00.000Z");
  });

  it("is editable, with no note, for the account's owner with write access", () => {
    const event = toCalendarEvent(timed, { ...target, editability: "editable" });
    expect(event?.readOnly).toBe(false);
    expect(event?.readOnlyNote).toBeUndefined();
  });

  it("asks the owner to reconnect when only the read scope was granted", () => {
    const event = toCalendarEvent(timed, { ...target, editability: "needs-reconnect" });
    expect(event?.readOnly).toBe(true);
    expect(event?.readOnlyNote).toMatch(/Reconnect/);
  });

  it("labels an untitled event", () => {
    expect(toCalendarEvent({ ...timed, summary: "   " }, target)?.title).toBe("(no title)");
  });

  it("drops cancelled, declined and working-location events", () => {
    expect(toCalendarEvent({ ...timed, status: "cancelled" }, target)).toBeNull();
    expect(toCalendarEvent({ ...timed, eventType: "workingLocation" }, target)).toBeNull();
    expect(
      toCalendarEvent(
        { ...timed, attendees: [{ self: true, responseStatus: "declined" }] },
        target,
      ),
    ).toBeNull();
  });

  it("keeps an event someone else declined", () => {
    expect(
      toCalendarEvent(
        { ...timed, attendees: [{ self: false, responseStatus: "declined" }] },
        target,
      ),
    ).not.toBeNull();
  });

  it("skips events with missing or unparseable dates", () => {
    expect(toCalendarEvent({ id: "x", start: { dateTime: "2026-09-10T14:00:00-05:00" } }, target)).toBeNull();
    expect(
      toCalendarEvent({ id: "y", start: { dateTime: "nope" }, end: { dateTime: "nope" } }, target),
    ).toBeNull();
    expect(toCalendarEvent({ id: "z", start: { date: "2026-9-4" }, end: { date: "2026-9-5" } }, target)).toBeNull();
  });
});

describe("toCalendarEvents", () => {
  it("keeps only the events worth drawing", () => {
    const events = toCalendarEvents([timed, { ...timed, id: "gone", status: "cancelled" }], target);

    expect(events.map((event) => event.id)).toEqual([googleEventId("conn1", "g1")]);
  });
});
