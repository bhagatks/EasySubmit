// Prisma 7 — URLs live here, not in schema.prisma.
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";
import {
  applyMigrateDatasourceUrl,
  shouldSkipLocalEnvFile,
} from "./lib/env/env-resolution.mjs";

const preservedDatabaseUrl = process.env.DATABASE_URL?.trim();
const preservedDirectUrl = process.env.DIRECT_URL?.trim();
const skipLocalEnv = shouldSkipLocalEnvFile(process.env);

// Never load laptop secrets when Vercel / vercel env run / prod URLs are already injected.
if (!skipLocalEnv) {
  dotenv.config({ path: ".env.local" });
  if (preservedDatabaseUrl) process.env.DATABASE_URL = preservedDatabaseUrl;
  if (preservedDirectUrl) process.env.DIRECT_URL = preservedDirectUrl;
} else {
  if (preservedDatabaseUrl) process.env.DATABASE_URL = preservedDatabaseUrl;
  if (preservedDirectUrl) process.env.DIRECT_URL = preservedDirectUrl;
}

applyMigrateDatasourceUrl(process.env, process.argv.includes("migrate"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx --yes tsx prisma/seed.ts",
  },
  datasource: {
    // App runtime — transaction pooler on Vercel (:6543).
    // Migrations use DIRECT_URL (swapped above + scripts/prisma-migrate-deploy.mjs).
    url: env("DATABASE_URL"),
  },
});
