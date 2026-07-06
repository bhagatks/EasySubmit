#!/usr/bin/env node
/**
 * Run a command against prod Postgres using `.env.prod.local` (never Vercel pull).
 *
 *   node scripts/run-prod-debug.mjs -- npx tsx scripts/enhance-trace-report.ts --job <id>
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PROD_DEBUG_ENV_FILE,
  PROD_SUPABASE_REF,
  resolveProdDebugEnvRecord,
} from "../lib/env/env-resolution.mjs";
import { loadEnv, runCommand } from "./env-lib.mjs";

const root = resolve(import.meta.dirname, "..");
const prodEnvPath = resolve(root, PROD_DEBUG_ENV_FILE);

function usage() {
  console.error("Usage: node scripts/run-prod-debug.mjs -- <command...>");
  console.error("");
  console.error("Requires .env.prod.local with prod DATABASE_URL.");
  console.error("  cp .env.prod.example .env.prod.local");
  console.error("  # paste Supabase prod connection string");
  process.exit(1);
}

const sep = process.argv.indexOf("--");
const cmd = sep >= 0 ? process.argv.slice(sep + 1) : [];
if (cmd.length === 0) {
  usage();
}

if (!existsSync(prodEnvPath)) {
  console.error(`❌ Missing ${PROD_DEBUG_ENV_FILE}`);
  console.error("   cp .env.prod.example .env.prod.local");
  console.error("   Paste DATABASE_URL from Supabase → yofgnflcqajqsepbfdkc → Database");
  process.exit(1);
}

const { vars } = loadEnv(PROD_DEBUG_ENV_FILE);
const { env, error } = resolveProdDebugEnvRecord(process.env, vars);

if (error === "missing_database_url") {
  console.error(`❌ DATABASE_URL not set in ${PROD_DEBUG_ENV_FILE}`);
  process.exit(1);
}

if (error === "not_prod_database_url") {
  console.error(
    `❌ DATABASE_URL in ${PROD_DEBUG_ENV_FILE} must target prod (${PROD_SUPABASE_REF}).`,
  );
  console.error("   Repair: node scripts/repair-local-env.mjs (if pasted into .env.local by mistake)");
  process.exit(1);
}

console.log(`→ Prod debug: ${PROD_SUPABASE_REF} via ${PROD_DEBUG_ENV_FILE} (laptop .env.local DB ignored)`);
runCommand(cmd[0], cmd.slice(1), env, { cwd: root });
