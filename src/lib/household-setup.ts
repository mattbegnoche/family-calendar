import "server-only";

import {
  decryptFamilyCode,
  formatFamilyCode,
  mintFamilyCode,
  type FamilyCodeRecord,
} from "@/lib/family-code";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { UserFacingError } from "@/lib/errors";
import {
  SHARED_MEMBER_NAME,
  SHARED_MEMBER_SLUG,
  uniqueMemberSlug,
} from "@/lib/members";

/** Creating a household, minting its code, and editing its branding. */

export interface NewMemberInput {
  readonly name: string;
  readonly color: string;
}

export interface CreateHouseholdInput {
  readonly name: string;
  readonly timeZone: string;
  readonly color: string;
  readonly icon: string;
  /** The creator's own row on the calendar. Linked to their login. */
  readonly owner: NewMemberInput;
  /** Children and anyone else who needs a column but never signs in. */
  readonly others: readonly NewMemberInput[];
}

export interface CreatedHousehold {
  readonly householdId: string;
  /** Plaintext, formatted. The only moment this value exists outside the cipher. */
  readonly code: string;
}

const MAX_CODE_ATTEMPTS = 5;

/**
 * A codeIndex collision needs a 2^50 birthday coincidence, so this loop should
 * never run twice. It exists because the alternative — surfacing a raw unique
 * constraint violation to someone creating their family — is a much worse
 * failure than one extra round trip.
 */
async function withFreshCode<T>(
  run: (record: FamilyCodeRecord) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run(mintFamilyCode());
    } catch (error) {
      if (attempt >= MAX_CODE_ATTEMPTS || !isCodeCollision(error)) throw error;
    }
  }
}

function isCodeCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  return String(target ?? "").includes("codeIndex");
}

export async function createHousehold(
  userId: string,
  input: CreateHouseholdInput,
): Promise<CreatedHousehold> {
  return withFreshCode(async ({ code, codeIndex, codeCiphertext }) => {
    const householdId = await prisma.$transaction(async (tx) => {
      // Re-checked inside the transaction rather than trusted from the page
      // that rendered the form: a double-submit, or a second tab, must not be
      // able to strand the user's first household with no owner.
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { householdId: true },
      });
      if (!user) throw new UserFacingError("Your account no longer exists. Sign in again.");
      if (user.householdId) {
        throw new UserFacingError("You already belong to a family.");
      }

      const household = await tx.household.create({
        data: {
          name: input.name,
          timeZone: input.timeZone,
          color: input.color,
          icon: input.icon,
          codeIndex,
          codeCiphertext,
        },
        select: { id: true },
      });

      // The SHARED row is created first and always: every household-wide event
      // and task points at it, so a household without one has no valid target
      // for "Everyone".
      const taken = new Set<string>([SHARED_MEMBER_SLUG]);
      await tx.member.create({
        data: {
          householdId: household.id,
          slug: SHARED_MEMBER_SLUG,
          name: SHARED_MEMBER_NAME,
          color: input.color,
          kind: "SHARED",
          sortOrder: 0,
        },
      });

      const ownerSlug = uniqueMemberSlug(input.owner.name, taken);
      taken.add(ownerSlug);
      await tx.member.create({
        data: {
          householdId: household.id,
          slug: ownerSlug,
          name: input.owner.name,
          color: input.owner.color,
          kind: "PERSON",
          sortOrder: 1,
          userId,
        },
      });

      // Sequential rather than createMany: each slug depends on the ones
      // already allocated, and a family's member list is small enough that the
      // round trips do not matter.
      let sortOrder = 2;
      for (const member of input.others) {
        const slug = uniqueMemberSlug(member.name, taken);
        taken.add(slug);
        await tx.member.create({
          data: {
            householdId: household.id,
            slug,
            name: member.name,
            color: member.color,
            kind: "PERSON",
            sortOrder,
          },
        });
        sortOrder += 1;
      }

      await tx.user.update({
        where: { id: userId },
        data: { householdId: household.id, householdRole: "OWNER" },
      });

      // Starting a family of your own withdraws any request you had pending
      // somewhere else; leaving it would let an owner approve you into a
      // second household later.
      await tx.joinRequest.deleteMany({ where: { userId } });

      return household.id;
    });

    return { householdId, code: formatFamilyCode(code) };
  });
}

/**
 * The household's code in readable form, or null when it cannot be read.
 *
 * Null is a real state, not a bug: households created before invite codes
 * existed carry an empty ciphertext, and rotating FAMILY_CODE_SECRET makes
 * every existing ciphertext undecryptable. Both are recoverable by rotating
 * the code, which is exactly what the settings page offers when this is null.
 */
export function readFamilyCode(codeCiphertext: string): string | null {
  if (!codeCiphertext) return null;
  try {
    return formatFamilyCode(decryptFamilyCode(codeCiphertext));
  } catch (error) {
    // Logged, not swallowed: a household that suddenly cannot read its own
    // code usually means FAMILY_CODE_SECRET changed, and that is worth seeing
    // in the server logs rather than inferring from a UI prompt.
    console.warn(
      "[family-code] ciphertext could not be decrypted; the household will be asked to rotate:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/** Replaces the code. Anyone still holding the old one can no longer use it. */
export async function rotateFamilyCode(householdId: string): Promise<string> {
  return withFreshCode(async ({ code, codeIndex, codeCiphertext }) => {
    await prisma.household.update({
      where: { id: householdId },
      data: { codeIndex, codeCiphertext, codeRotatedAt: new Date() },
    });
    return formatFamilyCode(code);
  });
}

export interface HouseholdBrandingInput {
  readonly name?: string;
  readonly timeZone?: string;
  readonly color?: string;
  readonly icon?: string;
}

export async function updateHouseholdBranding(
  householdId: string,
  input: HouseholdBrandingInput,
): Promise<void> {
  await prisma.household.update({
    where: { id: householdId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
    },
  });
}
