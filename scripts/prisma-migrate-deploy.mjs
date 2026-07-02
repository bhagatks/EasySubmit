#!/usr/bin/env node
/**
 * Run prisma migrate deploy on DIRECT_URL (session/direct host).
 * Transaction pooler :6543 hangs on advisory locks — never use it for migrate.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractSupabaseRef,
  isProdDB,
  loadEnv,
  LOCAL_ENV_FILE,
  resolveMigrateEnvRecord,
} from "./env-lib.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const { vars: localVars } = loadEnv(LOCAL_ENV_FILE);
const { env, remoteWins } = resolveMigrateEnvRecord(process.env, localVars);

const direct = env.DIRECT_URL?.trim();
if (!direct) {
  console.error("❌ DIRECT_URL is required for prisma migrate deploy");
  console.error("   Local: set in .env.local · Vercel: Production env in dashboard");
  process.exit(1);
}

const host = direct.match(/@([^:/]+)/)?.[1] ?? "database";
const ref = extractSupabaseRef(env);
const target =
  remoteWins || isProdDB(env.DATABASE_URL) || isProdDB(direct)
    ? `production (${ref ?? "prod ref"})`
    : `local dev (${ref ?? "dev ref"})`;

console.log(`→ prisma migrate deploy via ${host} (DIRECT_URL) — ${target}`);
if (remoteWins) {
  console.log(`→ Skipped ${LOCAL_ENV_FILE} — injected/Vercel env wins`);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env,
  cwd: root,
});
process.exit(result.status ?? 1);
