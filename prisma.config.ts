import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 loads no env file of its own, and dotenv defaults to `.env`. On a
// host like Vercel there is no file at all and the real variables are already
// in process.env, so a missing file here is expected, not an error.
loadEnv({ path: ".env.local" });

/**
 * Migrations need DDL and advisory locks, so they use the DIRECT url rather
 * than Neon's pooler. The app's own runtime connection is the pooled
 * DATABASE_URL, configured in src/lib/prisma.ts.
 */
const directUrl = process.env.DIRECT_URL;

/**
 * `prisma generate` never opens a connection and runs during `postinstall` on
 * every host, so it must work without DIRECT_URL. Everything else that reaches
 * this config — migrate deploy, migrate status, db seed — needs the database,
 * and a missing variable should say so in words rather than as Prisma's
 * "datasource.url property is required".
 */
const isGenerate = process.argv.includes("generate");

if (!directUrl && !isGenerate) {
  throw new Error(
    [
      "DIRECT_URL is not set, and Prisma needs it for migrations.",
      "Locally it belongs in .env.local (see .env.example).",
      "On Vercel, add DATABASE_URL and DIRECT_URL under Settings → Environment Variables",
      "for EVERY environment that builds: Production, and Preview if a non-production",
      "branch such as `development` is deployed. Preview builds do not see Production variables.",
    ].join(" "),
  );
}

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: { path: "src/prisma/migrations" },
  // Optional so that `prisma generate` succeeds anywhere; the check above is
  // what turns a missing DIRECT_URL into a clear message for every other command.
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
});
