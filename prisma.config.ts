// Prisma 7 — URLs live here, not in schema.prisma.
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({ path: ".env.local" });

// Shell / Vercel / CI export wins over .env.local when already set.
const shellDatabaseUrl = process.env.DATABASE_URL?.trim();
const shellDirectUrl = process.env.DIRECT_URL?.trim();
if (shellDatabaseUrl) process.env.DATABASE_URL = shellDatabaseUrl;
if (shellDirectUrl) process.env.DIRECT_URL = shellDirectUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx --yes tsx prisma/seed.ts",
  },
  datasource: {
    // App runtime — transaction pooler on Vercel (:6543).
    url: env("DATABASE_URL"),
    // Migrations — session or direct host (:5432 / db.*.supabase.co). Never :6543.
    directUrl: env("DIRECT_URL"),
  },
});
