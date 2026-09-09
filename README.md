# Family Calendar

A shared calendar and task board for one household: a column per family member, events and repeating tasks on one grid, and read-only import of each adult's Google Calendar. Built with Next.js 16, Prisma 7 on Postgres (Neon), Auth.js with Google sign-in, and Tailwind 4.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill it in — see the comments in the file
pnpm db:migrate              # apply migrations to the DEVELOPMENT database
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google. The first sign-in creates a family; later ones join with the family's code from Settings.

## Environments

There are two databases, and the rule is simple: **`.env.local` only ever points at development.** Production credentials exist only in Vercel.

| Environment | Where the URLs live | Which Neon branch | How it gets migrated |
| ----------- | ------------------- | ----------------- | -------------------- |
| development | `.env.local` | `dev` | `pnpm db:migrate`, run by you |
| production | Vercel → Settings → Environment Variables (Production) | `main` | `pnpm build` on Vercel runs `prisma migrate deploy` before `next build` |

Setting it up once:

1. In the Neon console, open the project and create a branch: **Branches → New branch**, parent `main`, name `dev`. A branch starts as a copy of its parent, so it has the schema and data of that moment.
2. Copy the branch's pooled URL into `DATABASE_URL` and its direct URL into `DIRECT_URL` in `.env.local`.
3. In Vercel, make sure the Production environment variables hold the `main` branch's URLs and nothing in the repository does.

Day to day:

- New migration: write it under `src/prisma/migrations/`, run `pnpm db:migrate` locally, commit it. The next Vercel deploy applies it to production.
- Check what is pending: `pnpm db:status`.
- Seeding (`pnpm db:seed`) reads `.env.local`, so it only ever seeds development.
- Reset development to match production: in Neon, **reset the `dev` branch from `main`**. Nothing in this repo can do that to `main`.

## Deploying to Vercel

The build script is `prisma migrate deploy && next build`, so every deploy migrates the database it is pointed at before it builds. That makes the environment variables the whole story.

**Which branch deploys where.** Vercel builds the Production Branch (`main` unless changed in Settings → Git) as Production, and every other pushed branch as a Preview. Previews use the Preview environment variables, not Production's. If `development` is pushed, it builds as a Preview and needs Preview variables, or the build fails at `prisma migrate deploy` with "DIRECT_URL is not set".

**Variables to set** (Settings → Environment Variables), for Production, and for Preview if preview builds should work:

| Variable | Value |
| -------- | ----- |
| `DATABASE_URL` | Neon pooled URL of the `main` branch (Production) or the `dev` branch (Preview) |
| `DIRECT_URL` | The matching direct URL. Migrations need it. |
| `AUTH_SECRET` | `openssl rand -base64 32`; a different value from development |
| `AUTH_URL` | The site's URL, e.g. `https://family-calendar-neon-one.vercel.app` — pins the OAuth callback |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | The Google OAuth client |
| `FAMILY_CODE_SECRET` | Keys the encrypted family codes in the database, so it must be the SAME value everywhere that shares a database. While production and development share one, copy it from `.env.local`; only once they have separate databases may each have its own. Changing it makes every existing code unreadable until it is regenerated |
| `ALLOWED_EMAILS` | Optional. Leave unset to let any Google account create or join a family |

**Google Cloud Console**, for the OAuth client: add `https://<your-domain>/api/auth/callback/google` as an authorised redirect URI, keep the Google Calendar API enabled, and while the consent screen is in Testing add each family member's Google account as a test user.

**Going live:** set the variables, merge `development` into `main`, push `main`. Watch the build log for `prisma migrate deploy` applying any pending migrations, then sign in at the production URL.

## Scripts

| Script | What it does |
| ------ | ------------ |
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Apply migrations, then production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Apply pending migrations to the database in `.env.local` |
| `pnpm db:status` | Show pending migrations |
| `pnpm db:seed` | Seed a household into the development database |

## Google Calendar

Sign-in asks only for a profile. Calendar access is requested separately, from **Settings → Google Calendar → Connect**. Events from a connected calendar can be edited in the app by the person who connected it (and only by them); everyone else in the family sees them read-only. Calendars connected before editing existed stay read-only until that account is reconnected once. For the OAuth client behind `AUTH_GOOGLE_ID`, enable the Google Calendar API in Google Cloud Console, and while the consent screen is in Testing add each connecting account as a test user.

## Layout

- `src/app` — routes (App Router). `(dashboard)` is the signed-in app, `(onboarding)` the create-or-join flow.
- `src/components/calendar` — the first-party calendar: views, drag and drop, editor.
- `src/components/tasks` — the task board, list, and editor.
- `src/lib` — pure logic and data access. `calendar/` and `task-recurrence.ts` are covered by `test/`.
- `src/prisma` — schema, migrations, seed.
