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

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: { path: "src/prisma/migrations" },
  // `datasource` is optional and only consulted by migration/introspection
  // commands. Declaring it unconditionally made `prisma generate` fail during
  // `postinstall` on any host where DIRECT_URL is not set, even though generate
  // never opens a connection. Omitting it lets generate succeed and lets
  // `migrate deploy` fail with a clear message instead.
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
});
