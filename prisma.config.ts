// Prisma 7 — URLs live here, not in schema.prisma.
//
// IMPORTANT: Do not load `.env.local` in this file.
// Env is injected by scripts/run.mjs, Vercel, or `vercel env run` only.
// Loading `.env.local` here was overriding prod credentials on every deploy.
import { defineConfig, env } from "prisma/config";
import { applyMigrateDatasourceUrl } from "./lib/env/env-resolution.mjs";

applyMigrateDatasourceUrl(process.env, process.argv.includes("migrate"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx --yes tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
