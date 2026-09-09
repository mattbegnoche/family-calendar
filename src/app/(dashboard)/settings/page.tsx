import { CalendarDays, KeyRound, Palette, UserPlus, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddCalendarForm } from "@/components/settings/AddCalendarForm";
import { ConnectedCalendarList } from "@/components/settings/ConnectedCalendarList";
import { FamilyBrandingForm } from "@/components/settings/FamilyBrandingForm";
import { FamilyCodeCard } from "@/components/settings/FamilyCodeCard";
import { JoinRequestList } from "@/components/settings/JoinRequestList";
import { fetchHouseholdCodeCiphertext, requireHousehold } from "@/lib/household";
import { listCalendarConnections } from "@/lib/google/connections";
import { listLinkedGoogleAccounts } from "@/lib/google/linked-accounts";
import { HouseholdGlyph, householdTileGradient } from "@/lib/household-icons";
import { readFamilyCode } from "@/lib/household-setup";
import { listPendingJoinRequests } from "@/lib/join-requests";

/**
 * Requests arrive from other people's sessions, so a cached render would show
 * an owner a stale — possibly empty — approvals list.
 */
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { household, isOwner, userId } = await requireHousehold();

  // Only owners may see the code or the approvals queue, so only owners pay for
  // the queries. requireOwner is still what guards the actions themselves.
  const [code, pendingRequests] = isOwner
    ? await Promise.all([
        fetchHouseholdCodeCiphertext(household.id).then(readFamilyCode),
        listPendingJoinRequests(household.id),
      ])
    : [null, []];

  // Everyone sees the household's connected calendars; the picker only ever
  // offers the caller's own Google accounts.
  const [connections, linkedAccounts] = await Promise.all([
    listCalendarConnections(household.id),
    listLinkedGoogleAccounts(userId),
  ]);
  const connectedCalendars = connections.map((connection) => ({
    id: connection.id,
    summary: connection.summary,
    accountEmail: connection.accountEmail,
    memberName: connection.member.name,
    memberColor: connection.member.color,
    canRemove: isOwner || connection.account.userId === userId,
  }));
  const memberOptions = household.members.map((member) => ({
    id: member.id,
    name: member.name,
    color: member.color,
  }));
  // A person's own calendar most likely belongs in their own column.
  const defaultMemberId =
    household.members.find((member) => member.userId === userId)?.id ??
    household.members[0]?.id ??
    "";

  const people = household.members.filter((member) => member.kind !== "SHARED");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-10">
        {isOwner ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-4" />
                Family appearance
              </CardTitle>
              <CardDescription>
                The name, colour and icon shown at the top left.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FamilyBrandingForm
                name={household.name}
                color={household.color}
                icon={household.icon}
                timeZone={household.timeZone}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span
                  className="flex aspect-square size-9 items-center justify-center rounded-lg text-white"
                  style={{ backgroundImage: householdTileGradient(household.color) }}
                >
                  <HouseholdGlyph iconKey={household.icon} className="size-5" />
                </span>
                {household.name}
              </CardTitle>
              <CardDescription>
                {household.timeZone.replace(/_/g, " ")} · Only an owner can change the
                family name, appearance or code.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {isOwner ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="size-4" />
                  Family code
                </CardTitle>
                <CardDescription>
                  How another adult asks to join this family.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FamilyCodeCard code={code} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Requests to join
                  {pendingRequests.length > 0 ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {pendingRequests.length}
                    </span>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  Approving someone gives them their own column on the calendar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JoinRequestList requests={pendingRequests} />
              </CardContent>
            </Card>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Members
            </CardTitle>
            <CardDescription>
              Everyone with a column on the calendar. A member does not need a login —
              children have a column without an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {people.map((member) => (
                <li key={member.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: member.color }}
                    aria-hidden
                  />
                  <span className="font-medium">{member.name}</span>
                  {member.userId ? (
                    <span className="text-xs text-muted-foreground">has a login</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Events from connected Google calendars appear on the family calendar.
              Read-only for now: change them in Google Calendar and they update here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ConnectedCalendarList calendars={connectedCalendars} />
            <div className="border-t pt-5">
              <h3 className="mb-3 text-sm font-medium">Add a calendar</h3>
              <AddCalendarForm
                accounts={linkedAccounts}
                members={memberOptions}
                defaultMemberId={defaultMemberId}
                connectedCalendarIds={connections.map((connection) => connection.googleCalendarId)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
