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

const HOUSEHOLD_NAME = "Begnoche Family";
const HOUSEHOLD_TIME_ZONE = "America/Chicago";

/** Colours must be 6-digit hex — the DB enforces it via member_color_hex. */
const MEMBERS = [
  { slug: "everyone", name: "Household", color: "#4f46e5", kind: "SHARED", sortOrder: 0 },
  { slug: "matt", name: "Matt", color: "#0891b2", kind: "PERSON", sortOrder: 1 },
  { slug: "erika", name: "Erika", color: "#db2777", kind: "PERSON", sortOrder: 2 },
  { slug: "lacy", name: "Lacy", color: "#7c3aed", kind: "PERSON", sortOrder: 3 },
  { slug: "haven", name: "Haven", color: "#ea580c", kind: "PERSON", sortOrder: 4 },
];

/** Links an existing login to a member, when that user has signed in. */
const USER_LINKS = [{ email: "mattbegnochedev@gmail.com", slug: "matt" }];

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
