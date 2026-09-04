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

Database modeling + auth/DB wiring for FamilyCalendar
Context
The calendar UI works but runs entirely on in-memory sample data. A Neon Postgres database is provisioned (DATABASE_URL + DIRECT_URL in .env.local) and NextAuth v5 is installed, but nothing is connected: src/prisma/schema.prisma has zero models and no client has ever been generated, src/lib/prisma.ts is a single commented-out import, and the login/signup forms are static shadcn scaffolds with no submit handlers, no name attributes, and no signIn() calls.

Three blockers were found during exploration that must be fixed before any modeling matters:

Cross-major toolchain mismatch. prisma@8.0.0-rc.12 (CLI) against @prisma/client@7.10.0. The v8 CLI is a different product — prisma generate and prisma migrate dev do not exist in it (verified: npx prisma generate --help falls through to root help). This happened because npm's latest dist-tag on prisma currently points at the RC; stable is the prev tag, 7.10.0.
Prisma 7 requires a driver adapter. Verified in the installed runtime — the client throws "adapter is required to connect to your database." No @prisma/adapter-pg is installed.
Wrong env var names. .env.local defines BETTER_AUTH_SECRET, but Better Auth is not installed. NextAuth v5 needs AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET — all absent.
Decisions locked with the user: stable Prisma ORM 7.10.0 (classic schema.prisma + migrate dev + generate), and Google OAuth sign-in only — no email/password, no credentials provider, no password hashing. The signup page gets deleted.

Outcome: a migrated database, a working Google sign-in that stores a usable Calendar refresh token, and members/events/tasks modeled so the two kids appear on the calendar without logins.

The user is writing the code. This plan is the instruction set, not a work order for me.

Answering the schema-file question directly
Keep one schema.prisma. Prisma 7 does support multi-file schemas — you point schema in prisma.config.ts at a directory rather than a file — but there are open regressions filed against the 7.x line (prisma#28669, prisma#28673) claiming migrations and Studio ignore multi-file schemas. Unconfirmed for 7.10.0 specifically.

The file here lands around 250 lines. Splitting buys nothing at that size, and splitting later is a pure file-move with zero data implications. Revisit if it passes ~600 lines.

Step 1 — Fix the toolchain
pnpm add -D prisma@7.10.0 # pin exactly; `latest` is the 8.0 RC
pnpm add @prisma/adapter-pg@7.10.0 # bundles pg; do NOT install pg separately
pnpm add -D dotenv # Prisma 7 auto-loads no env file at all
Also in package.json: drop the postinstall: "prisma skills sync || exit 0" script. That's a Prisma 8 command; it silently no-ops after the downgrade.

And fix pnpm-workspace.yaml — three entries currently hold the literal placeholder string set this to true or false from the last install prompt.

Rewrite prisma.config.ts (currently v8 syntax — definePrismaConfig does not exist in v7):

import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env.local" }); // dotenv defaults to `.env`, which doesn't exist here

export default defineConfig({
schema: "src/prisma/schema.prisma", // non-default location; must be declared
migrations: { path: "src/prisma/migrations" },
datasource: { url: env("DIRECT_URL") }, // migrations need DDL + advisory locks,
// which must bypass Neon's pooler
});
Verify after downgrading that prisma/config really exports { defineConfig, env } — that could not be checked locally because only the v8 CLI is installed.

Env vars in .env.local: keep DATABASE_URL and DIRECT_URL, delete BETTER_AUTH_SECRET, add AUTH_SECRET (openssl rand -base64 32), AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET. Add a committed .env.example with the key names only.

Step 2 — The schema
src/prisma/schema.prisma. Two rules govern the whole file:

Auth.js field names are not yours to choose. Verified in @auth/core@0.41.3 lib/utils/providers.js:92 — defaultAccount whitelists exactly seven fields and they are spread straight into prisma.account.create({ data }). They must be snake_case Prisma fields.
@db.Timestamptz(3) on every instant. Prisma's default maps to timestamp(3) without time zone. Prisma round-trips UTC correctly, but every raw query and Neon SQL-editor session would be silently wrong. For a calendar app this is the highest-value annotation in the file.
Do not copy @db.Text from the Auth.js docs — those exist for MySQL's varchar(191) default. Prisma maps String to text on Postgres already; they're no-ops.

generator client {
provider = "prisma-client" // prisma-client-js is deprecated in v7
output = "../lib/generated/prisma" // required for this provider; gitignore it
}

datasource db {
provider = "postgresql" // no url/directUrl in v7 — see prisma.config.ts
}

// ---------- Auth.js. Field names dictated by @auth/prisma-adapter 2.11.3 ----------

model User {
id String @id @default(cuid())
name String?
email String @unique // getUserByEmail does findUnique
emailVerified DateTime? @db.Timestamptz(3)
image String?

// MUST be nullable. Verified: the adapter's createUser strips `id` and passes only
// { name, email, emailVerified, image }. A required column here kills the very first
// sign-in with a generic OAuth error at /api/auth/callback/google.
householdId String?
household Household? @relation(fields: [householdId], references: [id], onDelete: SetNull)

accounts Account[]
sessions Session[]
member Member?
createdEvents Event[] @relation("EventAuthor")
createdTasks Task[] @relation("TaskAuthor")

createdAt DateTime @default(now()) @db.Timestamptz(3)
updatedAt DateTime @updatedAt @db.Timestamptz(3)

@@index([householdId])
}

model Account {
// Surrogate id rather than a compound @@id, so CalendarConnection can FK to the grant.
id String @id @default(cuid())
userId String
type String
provider String
providerAccountId String

// snake_case is mandatory — see note above. refresh_token is where the Google
// Calendar credential lives.
refresh_token String?
access_token String?
expires_at Int? // epoch seconds; overflows Jan 2038, canonical anyway
token_type String?
scope String?
id_token String?
session_state String?

user User @relation(fields: [userId], references: [id], onDelete: Cascade)
calendarConnections CalendarConnection[]

@@unique([provider, providerAccountId]) // -> where: { provider_providerAccountId }
@@index([userId])
}

model Session {
id String @id @default(cuid())
sessionToken String @unique
userId String
expires DateTime @db.Timestamptz(3)
user User @relation(fields: [userId], references: [id], onDelete: Cascade)

@@index([userId])
}

// Never written under Google-only sign-in, but the adapter's types reference
// prisma.verificationToken. Keep it — one empty table.
model VerificationToken {
identifier String
token String
expires DateTime @db.Timestamptz(3)

@@unique([identifier, token])
}

// ---------- Household domain ----------

model Household {
id String @id @default(cuid())
name String
timeZone String @default("America/New_York") // anchors all-day event boundaries

users User[]
members Member[]
connections CalendarConnection[]
events Event[]
tasks Task[]

createdAt DateTime @default(now()) @db.Timestamptz(3)
updatedAt DateTime @updatedAt @db.Timestamptz(3)
}

enum MemberKind {
PERSON
SHARED // the "Everyone" row
}

model Member {
id String @id @default(cuid())
householdId String
household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

// Mirrors today's in-memory ids so src/lib/family.ts port mechanically:
// "everyone" | "mom" | "dad" | "lacy" | "haven"
slug String

name String
// VarChar(7) earns its place: src/lib/event-colors.ts builds fills by
// string-concatenating alpha onto this value ("#4f46e5" + "15"), so anything
// but 6-digit hex silently yields an invalid CSS color. Add a CHECK constraint
// (color ~ '^#[0-9a-fA-F]{6}$') by hand in the migration SQL.
color String @db.VarChar(7)
kind MemberKind @default(PERSON)
sortOrder Int @default(0)

// Soft delete. Hard deletion is blocked by Restrict below so history survives.
archivedAt DateTime? @db.Timestamptz(3)

// Optional link to a login. Lacy and Haven have a Member and no User.
userId String? @unique
user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

events Event[]
connections CalendarConnection[]
assignedTasks Task[] @relation("TaskAssignee")
completedTasks Task[] @relation("TaskCompleter")

@@unique([householdId, slug]) // guarantees exactly one "everyone"
@@index([householdId, sortOrder]) // calendar column order
}

// ---------- Google connections ----------

model CalendarConnection {
id String @id @default(cuid())
householdId String
household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

accountId String // one hop to refresh_token
account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

memberId String // which column imported events land in
member Member @relation(fields: [memberId], references: [id], onDelete: Restrict)

googleCalendarId String
summary String?
enabled Boolean @default(true)

// Pull-on-demand freshness for a single rolling window. Deliberately NOT a
// syncToken: Google forbids syncToken alongside timeMin/timeMax, so the windowed
// strategy and the token strategy are mutually exclusive. Windowed is v1.
syncWindowStart DateTime? @db.Date
syncWindowEnd DateTime? @db.Date
lastSyncedAt DateTime? @db.Timestamptz(3)
lastSyncError String?

events Event[]

@@unique([accountId, googleCalendarId])
@@unique([householdId, googleCalendarId]) // stops both parents importing the shared
// family calendar and doubling every event
@@index([householdId, enabled])
}

// ---------- Events: local and imported in one table ----------

enum EventSource { LOCAL GOOGLE }
enum EventStatus { CONFIRMED TENTATIVE CANCELLED }

model Event {
id String @id @default(cuid())
householdId String
household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

// Denormalized onto the row rather than derived from the connection, so one
// event can be reassigned without moving the whole calendar.
memberId String
member Member @relation(fields: [memberId], references: [id], onDelete: Restrict)

source EventSource @default(LOCAL)
status EventStatus @default(CONFIRMED) // Google sends deletions as "cancelled"

connectionId String?
connection CalendarConnection? @relation(fields: [connectionId], references: [id], onDelete: Cascade)
googleEventId String?
googleEtag String?
googleUpdatedAt DateTime? @db.Timestamptz(3)

title String
description String?
location String?

// All-day events stored as [local midnight, next local midnight) in Household.timeZone,
// so one index serves every event.
startsAt DateTime @db.Timestamptz(3)
endsAt DateTime @db.Timestamptz(3)
allDay Boolean @default(false)

// When true, re-import must not clobber memberId (manual reassignment wins).
memberLocked Boolean @default(false)

createdById String?
createdBy User? @relation("EventAuthor", fields: [createdById], references: [id], onDelete: SetNull)

createdAt DateTime @default(now()) @db.Timestamptz(3)
updatedAt DateTime @updatedAt @db.Timestamptz(3)

// The idempotent re-import key. Both columns nullable, and Postgres treats NULLs as
// distinct in a unique index, so LOCAL rows never collide with each other.
@@unique([connectionId, googleEventId])
@@index([householdId, startsAt])
@@index([memberId])
}

// ---------- Tasks ----------

model Task {
id String @id @default(cuid())
householdId String
household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

// Assignee is a MEMBER — a kid with no login can own a task.
memberId String
member Member @relation("TaskAssignee", fields: [memberId], references: [id], onDelete: Restrict)

// Author is a USER — "we add tasks on their behalf". Nullable so a task
// outlives its author's account.
createdById String?
createdBy User? @relation("TaskAuthor", fields: [createdById], references: [id], onDelete: SetNull)

title String
notes String?
dueAt DateTime? @db.Timestamptz(3)

// completedAt over a boolean: same information plus "when".
completedAt DateTime? @db.Timestamptz(3)
completedByMemberId String?
completedByMember Member? @relation("TaskCompleter", fields: [completedByMemberId], references: [id], onDelete: SetNull)

createdAt DateTime @default(now()) @db.Timestamptz(3)
updatedAt DateTime @updatedAt @db.Timestamptz(3)

@@index([householdId, dueAt])
@@index([householdId, completedAt])
@@index([memberId])
}
Two modeling calls worth knowing
"Everyone" is a real Member row (kind: SHARED), not a nullable memberId. A nullable FK is arguably more honest, but it forces OR: [{ memberId: { in: ids } }, { memberId: null }] into every query and makes you synthesize a fake CalendarKit resource at render time with its color hardcoded — exactly the code/DB duplication this migration exists to remove. Cost: reports filter kind: PERSON.

Deleting a Member is Restrict + archivedAt soft delete. Cascade would delete a person's entire calendar history; SetNull would force memberId nullable and undo the decision above. Restrict plus soft delete is the only combination keeping memberId NOT NULL while preserving history.

Then: npx prisma migrate dev --name init && npx prisma generate, and add src/lib/generated/ to .gitignore.

Step 3 — Prisma client singleton
Replace the commented-out src/lib/prisma.ts. Runtime uses the pooled URL; only the CLI uses direct.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
Confirm the generated entry path after the first generate — it may be .../generated/prisma rather than .../generated/prisma/client.

Step 4 — Auth wiring
Rewrite src/auth.ts. The authorization.params block is the single most important thing here.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
adapter: PrismaAdapter(prisma),
session: { strategy: "database", maxAge: 60 _ 60 _ 24 \* 90 },
providers: [
Google({
authorization: {
params: {
access_type: "offline", // without this, refresh_token is NULL forever
prompt: "consent",
scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
},
},
}),
],
callbacks: {
signIn({ user }) {
const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",");
return !!user.email && allowed.includes(user.email);
},
session({ session, user }) {
// The adapter's getSessionAndUser does `include: { user: true }`, so the full
// User row is already here — resolving the household costs no extra query.
session.user.id = user.id;
// @ts-expect-error augment the Session type in a d.ts
session.user.householdId = (user as { householdId: string | null }).householdId;
return session;
},
},
});
The refresh-token trap, verified in the installed source. handle-login.js:104-126: when getUserByAccount finds an existing Account, Auth.js creates a session and returns immediately — linkAccount is never called again. Tokens are written exactly once, at first link, and never refreshed. So a first sign-in without access_type: "offline" leaves refresh_token = NULL permanently, and signing in again will not fix it. Recovery is deleting the Account row or revoking at myaccount.google.com/permissions. Set the params before you sign in the first time.

Google Cloud Console: create OAuth credentials, add http://localhost:3000/api/auth/callback/google as an authorized redirect URI, and enable the Google Calendar API on the project.

Then wire the UI:

src/components/login-form.tsx — add "use client", make the Google button call signIn("google"). Strip the email/password fields and the dead href="#" links.
Delete src/app/(auth)/signup/page.tsx and src/components/signup-form.tsx.
Add proxy.ts at the same level as app/ — not middleware.ts, which is deprecated in Next 16. Every NextAuth guide will tell you the wrong filename here. Keep Prisma out of it (split an edge-safe auth.config.ts) since it runs on the edge runtime.
Step 5 — Household bootstrap and seeding
Nothing creates a Household, so the first sign-in leaves householdId NULL. Add a createUser event in auth.ts — Auth.js awaits it before createSession, so the first session already sees the link. First user creates the household and seeds the five members from src/lib/family.ts (slugs everyone, mom, dad, lacy, haven, with their existing hex colors); the second user joins the existing one.

Once members are DB-backed, src/lib/event-colors.ts breaks quietly — it builds EVENT_COLOR_CSS at module load from the hardcoded constant, so a member added later gets no override rule and their events render at CalendarKit's 8% grey with no error. Change it to a useMemo(() => buildEventColorCss(members), [members]) inside the component.

Verification
npx prisma migrate dev --name init succeeds; npx prisma studio shows every table.
Sign in with Google at /login. Then confirm in Studio: Account.refresh_token is not NULL. If it is, delete the Account row, fix the params, and retry — this is the one failure that does not self-heal.
User.householdId is populated, and Household has five Member rows.
Sign in as the second parent; confirm they join the same household rather than creating one.
An email not in ALLOWED_EMAILS is rejected.
npx tsc --noEmit, pnpm lint, pnpm build all clean.
Restart the dev server and confirm the session survives.
Not in scope
Google Calendar import (the events.list pull, upserts, and window refresh) and the events/tasks API routes. Those come after sign-in reliably yields a refresh token — that's the gate.
