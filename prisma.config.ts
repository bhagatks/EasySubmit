// Prisma 7 — URLs live here, not in schema.prisma.
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({ path: ".env.local" });

// Shell / Vercel / CI export wins over .env.local when already set (app commands only).
const shellDatabaseUrl = process.env.DATABASE_URL?.trim();
if (shellDatabaseUrl) process.env.DATABASE_URL = shellDatabaseUrl;

// migrate * must use session/direct host — transaction pooler :6543 hangs on advisory locks.
const isMigrateCli = process.argv.includes("migrate");
if (isMigrateCli && process.env.DIRECT_URL?.trim()) {
  process.env.DATABASE_URL = process.env.DIRECT_URL.trim();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx --yes tsx prisma/seed.ts",
  },
  datasource: {
    // App runtime — transaction pooler on Vercel (:6543).
    // Migrations use DIRECT_URL via scripts/prisma-migrate-deploy.mjs (not directUrl here — not in Prisma 7 TS types).
    url: env("DATABASE_URL"),
  },
});
