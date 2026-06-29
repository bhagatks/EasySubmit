#!/usr/bin/env node
/**
 * Run prisma migrate deploy on DIRECT_URL (session/direct host).
 * Transaction pooler :6543 hangs on advisory locks — never use it for migrate.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMigrateEnv } from "./env-lib.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const env = resolveMigrateEnv(process.env);

const direct = env.DIRECT_URL?.trim();
if (!direct) {
  console.error("❌ DIRECT_URL is required for prisma migrate deploy");
  console.error("   Local: set in .env.local · Vercel: Production env in dashboard");
  process.exit(1);
}

const host = direct.match(/@([^:/]+)/)?.[1] ?? "database";
console.log(`→ prisma migrate deploy via ${host} (DIRECT_URL)`);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env,
  cwd: root,
});
process.exit(result.status ?? 1);
