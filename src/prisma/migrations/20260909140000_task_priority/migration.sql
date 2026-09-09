-- Task priority.

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable
--
-- DEFAULT 'MEDIUM' stays on the column rather than being dropped after the
-- backfill: "normal" is the honest value for a task nobody has triaged, and
-- every existing row predates the field for exactly that reason.
ALTER TABLE "Task"
  ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';
