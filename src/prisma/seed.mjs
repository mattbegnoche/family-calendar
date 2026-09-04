/**
 * One-off household setup. Idempotent — safe to re-run.
 *
 * Deliberately plain SQL over the pg driver rather than the Prisma client:
 * this runs outside Next's module resolution, and there is no TypeScript
 * runner wired up for standalone scripts.
 *
 *   node src/prisma/seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();

for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const require = createRequire(import.meta.url);
const { Client } = require("pg");

/**
 * Household details come from the environment, not from source. This repository
 * is public; family names and addresses are not.
 *
 *   HOUSEHOLD_NAME       "The Smith Family"
 *   HOUSEHOLD_TIME_ZONE  IANA zone, e.g. "America/Chicago"
 *   HOUSEHOLD_MEMBERS    JSON array of { slug, name, color, kind?, sortOrder? }
 *
 * See .env.example for the shape.
 */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

const HOUSEHOLD_NAME = requireEnv("HOUSEHOLD_NAME");
const HOUSEHOLD_TIME_ZONE = process.env.HOUSEHOLD_TIME_ZONE ?? "America/Chicago";

function parseMembers() {
  let parsed;
  try {
    parsed = JSON.parse(requireEnv("HOUSEHOLD_MEMBERS"));
  } catch (error) {
    throw new Error(`HOUSEHOLD_MEMBERS is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("HOUSEHOLD_MEMBERS must be a non-empty JSON array");
  }
  return parsed.map((member, index) => {
    if (!member.slug || !member.name) {
      throw new Error(`HOUSEHOLD_MEMBERS[${index}] needs a slug and a name`);
    }
    // Fail here rather than let Postgres reject it via member_color_hex.
    if (!HEX_COLOR.test(member.color ?? "")) {
      throw new Error(
        `HOUSEHOLD_MEMBERS[${index}] (${member.slug}) needs a 6-digit hex colour`,
      );
    }
    return {
      slug: member.slug,
      name: member.name,
      color: member.color,
      kind: member.kind === "SHARED" ? "SHARED" : "PERSON",
      sortOrder: member.sortOrder ?? index,
    };
  });
}

const MEMBERS = parseMembers();

/**
 * Links a login to a member, once that person has signed in at least once.
 * HOUSEHOLD_USER_LINKS is JSON: [{ "email": "...", "slug": "..." }]
 */
const USER_LINKS = JSON.parse(process.env.HOUSEHOLD_USER_LINKS ?? "[]");

const client = new Client({ connectionString: process.env.DIRECT_URL });
await client.connect();

try {
  await client.query("BEGIN");

  const existing = await client.query(
    `SELECT id FROM "Household" WHERE name = $1 LIMIT 1`,
    [HOUSEHOLD_NAME],
  );

  let householdId = existing.rows[0]?.id;
  if (householdId) {
    console.log(`household already exists: ${householdId}`);
  } else {
    const created = await client.query(
      `INSERT INTO "Household" (id, name, "timeZone", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, now(), now())
       RETURNING id`,
      [HOUSEHOLD_NAME, HOUSEHOLD_TIME_ZONE],
    );
    householdId = created.rows[0].id;
    console.log(`created household: ${householdId}`);
  }

  for (const member of MEMBERS) {
    await client.query(
      `INSERT INTO "Member"
         (id, "householdId", slug, name, color, kind, "sortOrder", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::"MemberKind", $6, now(), now())
       ON CONFLICT ("householdId", slug) DO UPDATE
         SET name = EXCLUDED.name,
             color = EXCLUDED.color,
             kind = EXCLUDED.kind,
             "sortOrder" = EXCLUDED."sortOrder",
             "updatedAt" = now()`,
      [householdId, member.slug, member.name, member.color, member.kind, member.sortOrder],
    );
  }
  console.log(`upserted ${MEMBERS.length} members`);

  // Put every existing login in this household; nothing creates one in the UI yet.
  const attached = await client.query(
    `UPDATE "User" SET "householdId" = $1, "updatedAt" = now()
     WHERE "householdId" IS DISTINCT FROM $1 RETURNING email`,
    [householdId],
  );
  if (attached.rowCount) {
    console.log(`attached users: ${attached.rows.map((r) => r.email).join(", ")}`);
  }

  for (const link of USER_LINKS) {
    const result = await client.query(
      `UPDATE "Member" m SET "userId" = u.id, "updatedAt" = now()
       FROM "User" u
       WHERE u.email = $1 AND m."householdId" = $2 AND m.slug = $3
       RETURNING m.slug`,
      [link.email, householdId, link.slug],
    );
    if (result.rowCount) console.log(`linked ${link.email} -> member "${link.slug}"`);
    else console.log(`no user ${link.email} yet; member "${link.slug}" left unlinked`);
  }

  await client.query("COMMIT");
  console.log("\nseed complete");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("seed failed, rolled back:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
