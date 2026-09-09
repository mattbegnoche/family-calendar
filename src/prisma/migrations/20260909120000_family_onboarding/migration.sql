-- Multi-household onboarding: roles, secret invite codes, and join requests.

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'ADULT');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "householdRole" "HouseholdRole";

-- Anyone already attached to a household predates this migration and was put
-- there by the seed script, i.e. they are the people who set the thing up.
-- Backfilling them as OWNER keeps at least one administrator per existing
-- household; without it nobody could ever read the code or approve a join.
UPDATE "User" SET "householdRole" = 'OWNER' WHERE "householdId" IS NOT NULL;

-- AlterTable
--
-- Both code columns are NOT NULL, so existing rows need a value before the
-- constraint lands. A DEFAULT applied during ADD COLUMN backfills every row in
-- one pass; it is dropped immediately afterwards so new households are forced
-- to supply a real code from src/lib/family-code.ts.
ALTER TABLE "Household"
  ADD COLUMN "codeIndex" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "codeCiphertext" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "codeRotatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- A real codeIndex is HMAC-SHA256 rendered as 64 hex characters. 'unset:' || id
-- is unique (id is the primary key) and can never collide with one, so no code
-- anyone could type will ever resolve to a pre-existing household. Leaving
-- codeCiphertext empty is the signal the application reads as "no readable
-- code": the settings page turns it into a "generate a code" prompt for the
-- owner rather than showing a broken value.
UPDATE "Household" SET "codeIndex" = 'unset:' || "id" WHERE "codeIndex" = '';

ALTER TABLE "Household"
  ALTER COLUMN "codeIndex" DROP DEFAULT,
  ALTER COLUMN "codeCiphertext" DROP DEFAULT;

-- Sidebar branding. Both have defaults, so existing rows need no backfill and
-- the defaults stay on the column: a household that never picks a colour is a
-- normal state, not a missing value.
ALTER TABLE "Household"
  ADD COLUMN "color" VARCHAR(7) NOT NULL DEFAULT '#4f46e5',
  ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'calendar';

-- Same CHECK as "Member"."color": event-colors.ts and the sidebar tile both
-- concatenate onto this value, so non-hex would silently render as nothing.
ALTER TABLE "Household"
  ADD CONSTRAINT "household_color_hex" CHECK ("color" ~ '^#[0-9a-fA-F]{6}$');

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedName" TEXT NOT NULL,
    "requestedColor" VARCHAR(7) NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- Mirrors the CHECK already guarding "Member"."color": src/lib/event-colors.ts
-- concatenates an alpha suffix onto these values, so anything but 6-digit hex
-- silently produces an invalid CSS colour once the request is approved.
ALTER TABLE "JoinRequest"
  ADD CONSTRAINT "joinrequest_color_hex" CHECK ("requestedColor" ~ '^#[0-9a-fA-F]{6}$');

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_userId_key" ON "JoinRequest"("userId");

-- CreateIndex
CREATE INDEX "JoinRequest_householdId_status_idx" ON "JoinRequest"("householdId", "status");

-- CreateIndex
CREATE INDEX "JoinRequest_reviewedById_idx" ON "JoinRequest"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "Household_codeIndex_key" ON "Household"("codeIndex");

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
