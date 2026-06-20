#!/usr/bin/env node
/**
 * Validates DATABASE_URL in .env.local and tests a live connection.
 */
import { existsSync, readFileSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import pg from "pg";

loadDotenv({ path: ".env" });
loadDotenv({ path: ".env.local", override: true });

const connectionString = process.env.DATABASE_URL;
const envFile = ".env.local";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!existsSync(envFile)) {
  fail(`Missing ${envFile} — run easy to auto-create it.`);
}

if (!connectionString) {
  fail(`DATABASE_URL is not set in ${envFile}`);
}

let url;
try {
  url = new URL(connectionString);
} catch {
  fail("DATABASE_URL is not a valid URI");
}

console.log(`→ Database (local): ${url.username} @ ${url.hostname}`);

if (url.hostname.includes("pooler.supabase.com") && !url.username.includes(".")) {
  fail(
    `Pooler host requires username postgres.<project-ref>, got "${url.username}".`,
  );
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
  console.error("Fix: update DATABASE_URL in .env.local, then run easy again.");
  process.exit(1);
} finally {
  await pool.end();
}
