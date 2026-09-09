-- Repeating tasks, and per-occurrence completion for them.
--
-- Task.icon is unchanged in type but changes meaning: it now holds a key into
-- src/lib/task-icons.ts rather than an emoji. Existing emoji values are left
-- in place; the renderer treats any unknown key as the default icon, so no
-- backfill is needed and nothing breaks if a row is never edited.

-- CreateEnum
CREATE TYPE "RepeatFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
--
-- A null frequency means "happens once", which is what every existing task
-- is, so no backfill. The defaults stay on the interval and weekday columns:
-- "every 1" and "the due date's own weekday" are the honest values for a
-- rule nobody has customised.
ALTER TABLE "Task" ADD COLUMN     "repeatFrequency" "RepeatFrequency",
ADD COLUMN     "repeatInterval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "repeatUntil" TIMESTAMPTZ(3),
ADD COLUMN     "repeatWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
--
-- Only checked-off occurrences are stored; one with no row is not done yet.
CREATE TABLE "TaskCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "occurrenceStart" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedByMemberId" TEXT,

    CONSTRAINT "TaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCompletion_completedByMemberId_idx" ON "TaskCompletion"("completedByMemberId");

-- CreateIndex
--
-- One row per occurrence: checking the same morning off twice is an upsert,
-- not a duplicate.
CREATE UNIQUE INDEX "TaskCompletion_taskId_occurrenceStart_key" ON "TaskCompletion"("taskId", "occurrenceStart");

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_completedByMemberId_fkey" FOREIGN KEY ("completedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
