#!/usr/bin/env node
/**
 * Validates DATABASE_URL and tests a live connection.
 * Expects env injected by scripts/run.mjs or dotenv from .env.local when run standalone.
 */
import pg from "pg";
import { isProdDB, loadEnv, mergeEnv, LOCAL_ENV_FILE, shouldSkipLocalEnvFile } from "./env-lib.mjs";
import { assertSafeForDevServer } from "./db-safety.mjs";

const { vars } = loadEnv(LOCAL_ENV_FILE);
const env = shouldSkipLocalEnvFile(process.env)
  ? mergeEnv(vars, process.env)
  : mergeEnv(process.env, vars);

const connectionString = env.DATABASE_URL;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!connectionString) {
  fail(`DATABASE_URL is not set in ${LOCAL_ENV_FILE}`);
}

assertSafeForDevServer(env);

if (isProdDB(connectionString)) {
  fail("DATABASE_URL appears to be production — use a dev Supabase project in .env.local");
}

let url;
try {
  url = new URL(connectionString.replace(/^postgresql:/, "http:"));
} catch {
  fail("DATABASE_URL is not a valid URI");
}

console.log(`→ Database (local): ${url.username} @ ${url.hostname}`);

if (url.hostname.includes("pooler.supabase.com") && !url.username.includes(".")) {
  fail(`Pooler host requires username postgres.<project-ref>, got "${url.username}".`);
}

if (!url.password || url.password.length < 8) {
  fail("DATABASE_URL password is missing or too short.");
}

const pool = new pg.Pool({ connectionString });
try {
  await pool.query("SELECT 1");
  console.log("✔ Database connection OK");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Database connection failed: ${message}`);
  console.error("");
  console.error(`Fix: update DATABASE_URL in ${LOCAL_ENV_FILE}, then run npm run dev again.`);
  process.exit(1);
} finally {
  await pool.end();
}
