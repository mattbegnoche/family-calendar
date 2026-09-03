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

### Non-goals (at least for v1)

- Native mobile apps. PWA only.
- Apple/Outlook/CalDAV sync. Google first; the sync layer should be pluggable, not generic.
- Multi-tenant SaaS. Assume a handful of households, all people I know.
- Photo frame mode, chore rewards/points economy, meal-plan grocery integration.

### Explicit success criterion

The wall tablet shows the correct week for the whole family, unattended, for 30 days without
a manual refresh or re-login. If that works, the project is a success even if nothing else ships.

---

## 2. Users and roles

| Role | Description |
| --- | --- |
| **Owner** | Created the household. Can invite/remove members, connect calendars, delete the household. |
| **Adult** | Full read/write on household events, can connect their own Google account. |
| **Member** | A person on the calendar. May or may not have a login (kids usually won't). |
| **Display** | A device, not a person. Read-only or read-plus-check-off. No password entry. |

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
- Responsive layout that is usable on a 10" tablet in landscape.

### Phase 2 — The wall display

- Display mode: dedicated route, no chrome, large type, auto-advancing to "today".
- Device pairing (short code) so the tablet gets a long-lived, restricted token.
- Live updates so an event added on a phone appears on the wall within seconds.
- Screen wake lock, periodic full reload, offline cache of the current week.
- Weather strip and time header (nice-to-have, cheap to build).

### Phase 3 — Two-way sync and recurrence

- Push local events back to a designated Google calendar.
- Recurring events (RRULE) including per-occurrence edits and deletions.
- Incremental sync via sync tokens plus Google push notifications instead of polling.

### Phase 4 — The rest of the Skylight surface

- Shared lists (groceries, packing, to-do).
- Chores with assignment and check-off from the display.
- Meal plan row attached to each day.

### Deliberately deferred

Photo slideshow, rewards/points, SMS reminders, per-member logins for kids.

---

## 4. Architecture

```
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Wall tablet  │   │     Phone     │   │    Laptop     │
│ (display mode)│   │     (PWA)     │   │               │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │ HTTPS / SSE
                  ┌─────────▼──────────┐
                  │  Web app (React)   │
                  │  CalendarKit +     │
                  │  shadcn/ui         │
                  └─────────┬──────────┘
                            │ REST (JSON), cookie session
                  ┌─────────▼──────────┐        ┌──────────────────┐
                  │   API service      │───────▶│  Google Calendar │
                  │  (TypeScript)      │◀───────│       API        │
                  │  ├─ auth           │  watch └──────────────────┘
                  │  ├─ events         │  channel
                  │  ├─ sync worker    │
                  │  └─ SSE hub        │
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │  Postgres (Neon)   │
                  │  + pg-boss queue   │
                  └────────────────────┘
```

---

## 5. Tech stack

### Frontend — decided

- **React + Vite** (or Next.js — see open decisions), TypeScript.
- **CalendarKit** for calendar views. Note: the free Basic tier does not include recurring
  events or full timezone handling; Pro does. Both of those land in Phase 3, so Basic is fine
  to start, but budget for the Pro license or plan to expand RRULEs server-side and feed
  CalendarKit flat occurrences. **Feeding it pre-expanded occurrences is the better design
  anyway** — see §7.
- **shadcn/ui** + Tailwind for everything that isn't the calendar grid. CalendarKit is built on
  shadcn/Tailwind, so the visual language lines up.
- **TanStack Query** for server state, cache invalidation, and optimistic event edits.
- **Temporal polyfill** or **date-fns-tz** for date math. Do not hand-roll timezone arithmetic.

### Backend — decided

**Fastify + TypeScript + Drizzle ORM + Neon Postgres, deployed as a standalone service.**
Locked 2026-09-01. See the decision log in §15.

Rationale:

- It's a *separate service*, not API routes bolted onto the frontend. That means you own routing,
  middleware, validation, error handling, connection pooling, background jobs, and deploy — the
  things backend interviews actually ask about. A Next.js route handler hides most of them.
- Fastify is small enough to understand end to end, has first-class TypeScript, and schema-based
  validation/serialization via TypeBox or Zod that doubles as OpenAPI output.
- Drizzle over Prisma here specifically because you've already shipped Prisma. Drizzle keeps you
  closer to the SQL, which matters for the recurrence and sync queries below, and it plays nicer
  with Neon's serverless driver.
- Neon is a known quantity for you and the free tier is more than enough for a family calendar.

The cost of this choice, stated plainly so it isn't a surprise in week three: a separate service
means two deploy targets, CORS and cookie configuration across origins, and no free
type-sharing between client and server. Mitigate the last one with a shared `packages/types`
workspace or by generating client types from the Fastify schemas — decide at M0, not M3.

Retreating to Next.js full-stack later is possible but would undo most of the point of the
project, so treat this as settled rather than provisional.

### Repo layout

A pnpm workspace monorepo, since the two deploy targets need to share types:

```
familycalendar/
├─ apps/
│  ├─ api/          # Fastify service — routes, sync worker, jobs
│  └─ web/          # React app + display mode
├─ packages/
│  ├─ types/        # shared event/household types, Zod schemas
│  └─ config/       # eslint, tsconfig bases
└─ planning.md
```

Two separate repos also works and deploys more simply, at the cost of copy-pasting types.
Recommend the monorepo.

### Infrastructure

- **Database:** Neon Postgres. Use the **pooled** connection string; a long-lived Fastify process
  should not be opening direct connections against an autosuspending compute. Free-tier compute
  hours are the real constraint on this project's bill — see §16 before designing the sync cadence.
- **Jobs/queue:** **pg-boss** — a Postgres-backed job queue. No Redis, no second service, and the
  sync jobs are low-volume. Handles the periodic sync sweep and the watch-channel renewals.
- **Hosting:** Fly.io or Railway for the API (needs a persistent process for SSE and jobs).
  Vercel or Netlify for the frontend. Cloudflare in front if you want caching.
- **Secrets:** Google refresh tokens encrypted at rest with a key from the environment, not
  stored in plaintext columns.
- **Observability:** structured logs (pino), a `/healthz` endpoint, and Sentry. Sync failures
  need to be visible or the wall tablet will silently show a stale week.

---

## 6. Auth

### Recommendation: Better Auth

Email/password *and* Google OAuth, session management, and account linking, with a Drizzle adapter
and a real self-hosted server story. Auth.js is the alternative you already know, but it's much
happier inside Next.js than in front of a standalone Fastify API.

### Requirements

- Email + password with proper hashing (argon2id) and email verification.
- Google OAuth for sign-in **and, separately,** Google Calendar authorization. Keep these two
  flows distinct: signing in with Google should not silently grant calendar scopes. Request
  `calendar.readonly` at connect time, and step up to `calendar.events` only in Phase 3.
- Account linking: a user who signed up with a password should be able to attach Google later.
- Sessions in httpOnly, SameSite=Lax cookies. Refresh tokens never leave the server.

### Display device auth (the interesting problem)

The wall tablet cannot re-authenticate through an OAuth redirect every 30 days, and it shouldn't
hold a full-privilege session in case a guest picks it up.

Design: an adult opens **Settings → Displays → Pair device**, gets a 6-character code, enters it
on the tablet. The server issues a long-lived opaque **device token** scoped to one household with
a `display` role: read events, optionally check off chores, nothing else. Tokens are listed in
settings and individually revocable. Rotate on use, or at least on a long interval.

---

## 7. Data model (first pass)

```
users              id, email, email_verified, password_hash, created_at
sessions           id, user_id, expires_at, ip, user_agent
oauth_accounts     id, user_id, provider, provider_account_id, access_token,
                   refresh_token_encrypted, scopes, expires_at

households         id, name, timezone, week_starts_on, created_by
household_members  id, household_id, user_id (nullable), display_name, color,
                   avatar_url, role  -- owner | adult | member
invitations        id, household_id, email, token, role, expires_at, accepted_at

calendars          id, household_id, member_id, source (local|google),
                   external_id, name, color, sync_token, watch_channel_id,
                   watch_expires_at, last_synced_at, sync_error

events             id, calendar_id, household_id, title, description, location,
                   starts_at timestamptz, ends_at timestamptz,
                   start_date date, end_date date,      -- all-day only
                   is_all_day, timezone, rrule, exdates,
                   external_id, etag, source_updated_at,
                   created_by, updated_at, deleted_at

event_overrides    id, event_id, occurrence_start, status (modified|cancelled),
                   overridden fields...
event_members      event_id, household_member_id   -- "whose event is this"

devices            id, household_id, name, token_hash, role, last_seen_at, revoked_at
```

### Rules that will save pain later

1. **Store instants in UTC (`timestamptz`) plus the originating IANA timezone.** Never store
   local wall-clock time in a naive column.
2. **All-day events are dates, not midnight timestamps.** Separate columns; a `DATE` for an
   all-day event does not shift when someone travels.
3. **Never persist expanded recurrence occurrences.** Store the RRULE and exceptions; expand
   on read for the requested window. Persisting expansions means every rule edit becomes a
   migration.
4. **Soft-delete events** (`deleted_at`). Google sync will resurrect hard-deleted rows.
5. **`external_id` + `etag` are the sync identity.** Unique index on
   `(calendar_id, external_id)`.

---

## 8. Google Calendar sync

### Import (Phase 1)

1. User connects Google, grants `calendar.readonly`, picks which of their calendars to mirror.
2. Initial full sync: page through `events.list` with `singleEvents=false`, store the master
   events with their RRULEs. Save the returned `nextSyncToken`.
3. Map each Google calendar to a household member so events pick up that member's color.

### Incremental (Phase 3)

- Store `syncToken` per calendar; subsequent `events.list` calls pass it and get only deltas.
- On `410 GONE`, discard the token and do a full resync. This *will* happen; handle it.
- Register a **watch channel** pointing at a public webhook so Google pushes change
  notifications. Channels expire — schedule renewal jobs well before `watch_expires_at`.
- Keep a slow polling sweep (every 15–30 min) as a backstop. Push notifications get missed.

### Two-way (Phase 3)

- Locally created events go to one designated "FamilyCalendar" Google calendar, not scattered
  across members' personal calendars.
- Conflict policy: **last-write-wins by `updated_at`**, with the Google `etag` used for
  optimistic concurrency on write. Log conflicts rather than silently dropping them.
- Guard against echo loops: tag app-written events (extended properties) and skip them on the
  way back in.

---

## 9. Realtime updates

Use **Server-Sent Events**, not WebSockets. The traffic is one-directional (server → display),
SSE survives proxies, and the browser reconnects on its own.

- `GET /api/households/:id/stream` → events like `event.created`, `event.updated`, `sync.completed`.
- In-process pub/sub is enough at one API instance. If it ever scales past one, move to
  Postgres `LISTEN/NOTIFY`.
- Client falls back to a 60-second poll if the stream drops.

---

## 10. Display mode notes

- Route: `/display` — no nav, no auth prompt, huge type, high contrast.
- Screen Wake Lock API to keep the tablet awake; re-acquire on `visibilitychange`.
- Full page reload nightly at ~3am to shed memory leaks and pick up deploys.
- Service worker caches the shell and the current week so a Wi-Fi blip shows stale data
  rather than a blank screen.
- Rotate/shift layout by a few pixels periodically if the tablet is OLED (burn-in).
- Design at the real target size early. A week grid that works on a laptop is often unreadable
  from six feet away.

---

## 11. API sketch

```
POST   /auth/sign-up | /auth/sign-in | /auth/sign-out
GET    /auth/google | /auth/google/callback

GET    /api/households/:id
POST   /api/households
POST   /api/households/:id/members
POST   /api/households/:id/invitations

GET    /api/households/:id/events?from=&to=      # expanded occurrences
POST   /api/households/:id/events
PATCH  /api/events/:id?scope=this|following|all
DELETE /api/events/:id?scope=this|following|all

POST   /api/calendars/google/connect
GET    /api/calendars                            # list + sync status
POST   /api/calendars/:id/sync                   # manual trigger
POST   /api/webhooks/google                      # watch notifications

POST   /api/devices/pair                         # returns code
POST   /api/devices/claim                        # tablet exchanges code for token
GET    /api/households/:id/stream                # SSE
```

The `scope=this|following|all` parameter on recurring event edits is the single fiddliest piece
of the whole app. Design it before writing the UI.

---

## 12. Roadmap

| Milestone | Contents | Rough effort |
| --- | --- | --- |
| **M0 — Walking skeleton** | Repo, Fastify + Drizzle + Neon, one `/healthz`, deployed frontend and backend, CI | 6h |
| **M1 — Auth** | Better Auth, email/password, Google sign-in, sessions, protected routes | 8h |
| **M2 — Households** | Households, members, colors, invite flow | 8h |
| **M3 — Local events** | CRUD, CalendarKit week/month views, member assignment | 14h |
| **M4 — Google import** | OAuth connect, full sync, calendar→member mapping | 12h |
| **M5 — Display mode** | Device pairing, `/display` route, SSE, wake lock, PWA | 12h |
| **M6 — Recurrence** | RRULE storage, server-side expansion, per-occurrence edits | 16h |
| **M7 — Incremental sync** | Sync tokens, watch channels, pg-boss jobs, backstop polling | 12h |
| **M8 — Lists & chores** | Shared lists, chores, check-off from display | 14h |

**Checkpoint after M5.** That's a working family calendar on the wall — the point at which the
project has delivered its actual value. M6+ is where the interesting backend work lives, but it
should be a deliberate choice to continue, not momentum.

---

## 13. Open decisions

1. **Vite or Next.js for the frontend?** Now that the API is a separate service, Next.js is
   mostly paying for SSR you don't need behind a login, and its server layer would sit idle.
   Vite + React Router is lighter and keeps the client/server split honest. Counterpoint:
   Next.js appears in more job postings. **Leaning Vite.** Decide at M0.
2. **CalendarKit Basic or Pro?** Pro's recurrence and timezone handling overlap with work you'd
   otherwise do server-side. Decide before M3 so the event-shape contract doesn't change twice.
3. **How much does the display write?** Read-only is simpler and safer. Check-off from the wall
   is the feature families actually use.
4. **Google sync direction for v1** — read-only import is 80% of the value for 40% of the work.
5. **Public webhook endpoint** — Google push requires a reachable HTTPS URL with a verified
   domain. If that's a hassle, polling-only is a legitimate v1 answer.
6. **One household or many?** Building for many from day one costs little if the `household_id`
   scoping is right from the first migration, and retrofits painfully later. Recommend: scope
   everything by household immediately, but ship with a single household.
7. **Guest/shared events** — does a babysitter or grandparent need a view-only link?

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Recurring events swallow the schedule | Ship non-recurring first; treat RRULE as its own milestone |
| Google OAuth verification for sensitive calendar scopes | Stay in testing mode with a handful of allowed users; it's a family app |
| Sync fails silently, wall shows stale data | Sync-status indicator on the display, alerts on repeated failure |
| Scope creep toward full Skylight parity | The checkpoint after M5 is real; lists and chores are optional |
| Neon compute autosuspend adds latency on first request | Accept the cold start. Do **not** add a keep-alive ping — see §16, it converts a $0 bill into a paid one |

---

## 15. Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-09-01 | Backend is a standalone **Fastify + TypeScript** service, not Next.js API routes | Owning routing, middleware, pooling, jobs, and deploy is the point of the project |
| 2026-09-01 | **Drizzle** over Prisma | Closer to SQL for the recurrence/sync queries; Prisma is already covered elsewhere |
| 2026-09-01 | **Neon Postgres** | Known quantity, free tier is ample, pooled endpoint suits a long-lived process |
| 2026-09-01 | **pnpm monorepo** with shared types package | Two deploy targets that must agree on the event shape |

Still open: frontend framework (§13.1), CalendarKit tier (§13.2), auth library (§6 recommends
Better Auth but it isn't locked).

---

## 16. Running cost

Target: **$0/month**, excluding the domain. That is achievable, but only if the design respects
the free-tier boundaries below. Rates verified September 2026 — re-check before committing.

### What is genuinely free at this scale

| Item | Cost | Notes |
| --- | --- | --- |
| Frontend hosting (Netlify / Vercel / Cloudflare Pages) | **$0** | A handful of users is nowhere near any bandwidth or build limit |
| Google Calendar API | **$0** | No charge for the Calendar API. Watch channels and sync are free |
| Google OAuth | **$0** | Stay in "testing" publishing mode with your family as test users; no verification review needed, and no fee if you ever do submit |
| GitHub / CI | **$0** | Free minutes cover a hobby repo |
| Neon Postgres | **$0**, *conditionally* | See the trap below |
| Domain | **~$12–20/yr** | Optional — a `*.netlify.app` subdomain works |

### The Neon trap

Neon's free plan is 0.5 GB storage and **~100 CU-hours of compute per month**, with the compute
suspending after five minutes of inactivity. The data is nothing — a family's events for a decade
won't approach 0.5 GB. **Compute hours are the constraint.**

The minimum compute size is 0.25 CU, so 100 CU-hours buys roughly **400 hours of awake database
per month**. A month is 720 hours. The database therefore has to be asleep about 45% of the time.

Now look at the design in this document: a wall tablet holding an SSE connection, plus a sync
sweep every 15 minutes, plus a nightly reload. That keeps the database awake essentially 24/7 —
about 180 CU-hours — which is roughly **1.8× the free allowance**, landing on the Launch plan at
$0.106/CU-hour for something in the neighborhood of $15–20/month. For a family calendar.

**Mitigations, in order of preference:**

1. **Let it sleep.** Run the sync sweep hourly rather than every 15 minutes, and pause it entirely
   between midnight and 6am. Nobody adds events at 3am.
2. **Don't hold the database open.** The SSE connection is between the browser and the *API*, not
   the database — make sure the API isn't keeping a warm pool or heartbeat query open just to
   avoid cold starts. Verify empirically that an idle pooled connection doesn't defeat autosuspend.
3. **Serve the display from cache.** The wall tablet re-reading the same week every 60 seconds
   should hit an in-memory cache in the API, not Postgres.
4. **If it still doesn't fit,** run Postgres in a container next to the API instead. At this scale
   a fixed $2/month box comfortably hosts both.

This is worth designing around at M0. Retrofitting sleep-friendliness after the sync worker exists
is annoying.

### The API host

This is the one line item with no free option. The service needs a persistent process for SSE and
background jobs, which rules out the free tiers that spin down on idle.

| Option | Cost | Notes |
| --- | --- | --- |
| Fly.io, one `shared-cpu-1x` 256 MB machine | **~$2/mo** | No permanent free tier since Oct 2024; billed per second, plus a little egress |
| Railway / Render paid tier | **~$5/mo** | Simpler than Fly; Render's free tier sleeps, which breaks SSE and cron |
| Hetzner / any cheap VPS | **~$4–5/mo** | Run API and Postgres together; more ops work, fewer moving parts |
| **Old laptop or Pi at home + Cloudflare Tunnel** | **$0** | Free HTTPS ingress, no port forwarding. Trade-off: uptime is your problem, and the wall calendar dies when the internet does |

### Realistic bottom line

- **~$2–5/month** on a small always-on host with Neon kept inside the free tier.
- **$0/month** if the API runs on hardware you already own behind a Cloudflare Tunnel.
- **~$15–25/month** if the sync sweep is left aggressive and Neon rolls onto a paid plan — the
  failure mode to avoid, since it's an accident rather than a choice.

Add a **billing alert on day one**, on both Neon and the host. The whole point of a hobby project
is that it doesn't surprise you with an invoice.
