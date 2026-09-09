-- Google Calendar connections: which Google calendars a household shows,
-- read with whose tokens, and drawn in whose column. Events themselves are
-- not stored; each calendar render pulls them straight from Google.

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarConnection_accountId_idx" ON "CalendarConnection"("accountId");

-- CreateIndex
CREATE INDEX "CalendarConnection_memberId_idx" ON "CalendarConnection"("memberId");

-- CreateIndex
--
-- Doubles as the householdId index. A calendar may be connected to a
-- household once, whichever parent's account it is read through, so a shared
-- family calendar cannot be imported twice and draw every event double.
CREATE UNIQUE INDEX "CalendarConnection_householdId_googleCalendarId_key" ON "CalendarConnection"("householdId", "googleCalendarId");

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
--
-- Cascade: removing the linked Google account takes every calendar it was
-- reading with it, since nothing could refresh those tokens any more.
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
--
-- Restrict, like Event and Task: members are archived rather than deleted
-- once anything points at them.
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
