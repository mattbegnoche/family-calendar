import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env.local" }); // dotenv defaults to `.env`, which doesn't exist here

export default defineConfig({
  schema: "src/prisma/schema.prisma", // non-default location; must be declared
  migrations: { path: "src/prisma/migrations" },
  datasource: { url: env("DIRECT_URL") }, // migrations need DDL + advisory locks,
  // which must bypass Neon's pooler
});
