-- How long a timed task's block on the calendar is.
--
-- The default stays on the column: 30 minutes is what every task was drawn
-- as before this existed, so an unedited task looks exactly as it did.
ALTER TABLE "Task" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 30;
