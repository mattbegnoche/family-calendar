import "server-only";

import { familyCodeIndex, normalizeFamilyCode } from "@/lib/family-code";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import { SHARED_MEMBER_SLUG, uniqueMemberSlug } from "@/lib/members";

/**
 * Joining an existing household.
 *
 * Two gates, deliberately. Knowing the code gets a request in front of an
 * owner; only an owner approving it grants access. A code read over someone's
 * shoulder, or forwarded to the wrong thread, therefore does not by itself put
 * a stranger on the family calendar.
 *
 * On brute force: the code carries ~50 bits of entropy and every attempt costs
 * an authenticated session, so guessing is attributable to a real account and
 * hopeless besides. That is the reason there is no attempt counter here — not
 * an oversight.
 */

/** Deliberately identical for "malformed" and "no such household". */
const NO_MATCH_MESSAGE =
  "That family code didn't match any family. Check it with whoever invited you.";

export interface JoinRequestInput {
  readonly code: string;
  readonly name: string;
  readonly color: string;
}

export interface SubmittedJoinRequest {
  readonly householdName: string;
}

export async function requestToJoin(
  userId: string,
  input: JoinRequestInput,
): Promise<SubmittedJoinRequest> {
  const normalized = normalizeFamilyCode(input.code);
  if (!normalized) throw new UserFacingError(NO_MATCH_MESSAGE);

  // The blind index turns "find the household for this code" into a unique
  // index seek. The plaintext code is never compared against anything.
  const household = await prisma.household.findUnique({
    where: { codeIndex: familyCodeIndex(normalized) },
    select: { id: true, name: true },
  });
  if (!household) throw new UserFacingError(NO_MATCH_MESSAGE);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { householdId: true },
    });
    if (!user) throw new UserFacingError("Your account no longer exists. Sign in again.");
    if (user.householdId) {
      throw new UserFacingError("You already belong to a family.");
    }

    // upsert, because JoinRequest.userId is unique: re-applying — to this
    // household or a different one — replaces the standing request rather
    // than queueing a second one.
    await tx.joinRequest.upsert({
      where: { userId },
      create: {
        householdId: household.id,
        userId,
        requestedName: input.name,
        requestedColor: input.color,
      },
      update: {
        householdId: household.id,
        requestedName: input.name,
        requestedColor: input.color,
        status: "PENDING",
        reviewedAt: null,
        reviewedById: null,
      },
    });
  });

  return { householdName: household.name };
}

export interface OwnJoinRequest {
  readonly id: string;
  readonly status: "PENDING" | "APPROVED" | "DENIED";
  readonly householdName: string;
  readonly requestedName: string;
  readonly createdAt: Date;
}

/** The signed-in user's own request, for the "waiting to be let in" screen. */
export async function findOwnJoinRequest(
  userId: string,
): Promise<OwnJoinRequest | null> {
  const request = await prisma.joinRequest.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      requestedName: true,
      createdAt: true,
      household: { select: { name: true } },
    },
  });
  if (!request) return null;

  return {
    id: request.id,
    status: request.status,
    householdName: request.household.name,
    requestedName: request.requestedName,
    createdAt: request.createdAt,
  };
}

/** Withdrawing lets the user go back and create a family or try another code. */
export async function cancelOwnJoinRequest(userId: string): Promise<void> {
  await prisma.joinRequest.deleteMany({ where: { userId } });
}

export interface PendingJoinRequest {
  readonly id: string;
  readonly requestedName: string;
  readonly requestedColor: string;
  readonly createdAt: Date;
  /** The Google identity behind the request — how an owner tells who this is. */
  readonly applicantName: string | null;
  readonly applicantEmail: string;
  readonly applicantImage: string | null;
}

export async function listPendingJoinRequests(
  householdId: string,
): Promise<PendingJoinRequest[]> {
  const requests = await prisma.joinRequest.findMany({
    where: { householdId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      requestedName: true,
      requestedColor: true,
      createdAt: true,
      user: { select: { name: true, email: true, image: true } },
    },
  });

  return requests.map((request) => ({
    id: request.id,
    requestedName: request.requestedName,
    requestedColor: request.requestedColor,
    createdAt: request.createdAt,
    applicantName: request.user.name,
    applicantEmail: request.user.email,
    applicantImage: request.user.image,
  }));
}

/**
 * Approve, and in the same transaction give the applicant their calendar
 * column and their login's household.
 *
 * `householdId` comes from the reviewer's own session, never from the form, and
 * every lookup below is scoped by it — so a forged request id belonging to
 * another household resolves to nothing instead of being actioned.
 */
export async function approveJoinRequest(
  householdId: string,
  requestId: string,
  reviewerId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const request = await tx.joinRequest.findFirst({
      where: { id: requestId, householdId, status: "PENDING" },
      select: {
        id: true,
        userId: true,
        requestedName: true,
        requestedColor: true,
      },
    });
    if (!request) {
      throw new UserFacingError("That request is no longer pending.");
    }

    const applicant = await tx.user.findUnique({
      where: { id: request.userId },
      select: { householdId: true },
    });
    if (!applicant) throw new UserFacingError("That person's account no longer exists.");
    if (applicant.householdId) {
      throw new UserFacingError("That person has already joined a family.");
    }

    const existing = await tx.member.findMany({
      where: { householdId },
      select: { slug: true, sortOrder: true },
    });
    const taken = new Set<string>([SHARED_MEMBER_SLUG, ...existing.map((m) => m.slug)]);
    const nextSortOrder =
      existing.reduce((highest, member) => Math.max(highest, member.sortOrder), 0) + 1;

    await tx.member.create({
      data: {
        householdId,
        slug: uniqueMemberSlug(request.requestedName, taken),
        name: request.requestedName,
        color: request.requestedColor,
        kind: "PERSON",
        sortOrder: nextSortOrder,
        userId: request.userId,
      },
    });

    await tx.user.update({
      where: { id: request.userId },
      data: { householdId, householdRole: "ADULT" },
    });

    await tx.joinRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: reviewerId },
    });
  });
}

export async function denyJoinRequest(
  householdId: string,
  requestId: string,
  reviewerId: string,
): Promise<void> {
  // updateMany, not update: the householdId in the filter is what stops one
  // household's owner from acting on another household's request.
  const result = await prisma.joinRequest.updateMany({
    where: { id: requestId, householdId, status: "PENDING" },
    data: { status: "DENIED", reviewedAt: new Date(), reviewedById: reviewerId },
  });

  if (result.count === 0) {
    throw new UserFacingError("That request is no longer pending.");
  }
}
