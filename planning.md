# FamilyCalendar — Planning

A self-hosted, web-based rebuild of the Skylight Calendar. One shared family calendar that
looks good on a wall-mounted tablet and works from any phone or laptop.

**Status:** planning
**Owner:** Matt
**Last updated:** 2026-09-01

---

## 1. Goals

- One shared household calendar with per-person color coding, viewable at a glance.
- Runs in any modern browser: wall tablet (primary display), phone, laptop.
- Pulls in each family member's existing Google Calendar so nobody has to double-enter events.
- Add and edit events directly in the app, without touching Google.
- Kiosk/display mode that stays logged in and refreshes itself on the wall tablet.
- Create "tasks" that can be assignable to each family memeber or a shared tasks that multiple family members can work on.
- These tasks need to be able live nested inside the calendar with all of the events.

### Non-goals (at least for v1)

- Native mobile apps. PWA only.
- Apple/Outlook/CalDAV sync. Google first; the sync layer should be pluggable, not generic.
- Multi-tenant SaaS. Assume a handful of households, all people I know.
- Photo frame mode, chore rewards/points economy, meal-plan grocery integration.

### Explicit success criterion

- I have a free application that help my family sync all of our events and taks in one place.

---

## 2. Users and roles

| Role        | Description                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| **Owner**   | Created the household. Can invite/remove members, connect calendars, delete the household. |
| **Adult**   | Full read/write on household events, can connect their own Google account.                 |
| **Member**  | A person on the calendar. May or may not have a login (kids usually won't).                |
| **Display** | A device, not a person. Read-only or read-plus-check-off. No password entry.               |

Key model decision: **a household member is not the same thing as a user account.** A member is
a name, a color, and an avatar. A user account may be linked to a member, but doesn't have to be.
This is what lets a 7-year-old have their own calendar column without an email address.

---

## 3. Feature scope

### Phase 1 — MVP

- Email/password + Google sign-in.
- Create a household; add members (name, color, avatar); invite adults by link.
- Local events: title, start/end, all-day, location, notes, assigned members.
- Week view and month view, color-coded by member.
- Google Calendar import (read-only, one-way), one connected calendar per adult.
- Responsive layout that is usable on all devices.

### Phase 2 — Two-way sync and recurrence

- Push local events back to a designated Google calendar.
- Recurring events (RRULE) including per-occurrence edits and deletions.
- Incremental sync via sync tokens plus Google push notifications instead of polling.

### Phase 3 — The rest of the Skylight surface

- Shared lists (groceries, packing, to-do).
- Chores with assignment and check-off from the display.
- Meal plan row attached to each day.
