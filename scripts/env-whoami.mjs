#!/usr/bin/env node
/**
 * Show which Supabase project .env.local targets (no secrets printed).
 *   npm run env:whoami
 */
import { existsSync } from "node:fs";
import {
  LOCAL_ENV_FILE,
  PROD_SUPABASE_REF,
  isProdDB,
  loadEnv,
  mergeEnv,
} from "./env-lib.mjs";

function extractRef(databaseUrl, supabasePublicUrl) {
  if (supabasePublicUrl) {
    const m = supabasePublicUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (m?.[1]) return m[1];
  }
  if (databaseUrl) {
    const userMatch = databaseUrl.match(/postgres\.([^:]+):/);
    if (userMatch?.[1]) return userMatch[1];
    const hostMatch = databaseUrl.match(/db\.([^.]+)\.supabase\.co/);
    if (hostMatch?.[1]) return hostMatch[1];
  }
  return null;
}

const { path, vars } = loadEnv(LOCAL_ENV_FILE);
if (!existsSync(path)) {
  console.error(`❌ ${LOCAL_ENV_FILE} not found — run npm run dev to bootstrap from .env.example`);
  process.exit(1);
}

const env = mergeEnv(process.env, vars);
const ref = extractRef(env.DATABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL);
const prod = isProdDB(env.DATABASE_URL);

console.log("━━━ EasySubmit env target ━━━\n");
console.log(`File: ${LOCAL_ENV_FILE}`);
console.log(`NEXTAUTH_URL: ${env.NEXTAUTH_URL ?? "(not set)"}`);

if (!env.DATABASE_URL) {
  console.log("DATABASE_URL: ❌ not set");
  process.exit(1);
}

try {
  const u = new URL(env.DATABASE_URL.replace(/^postgresql:/, "http:"));
  console.log(`DATABASE_URL host: ${u.hostname}:${u.port || "5432"}`);
} catch {
  console.log("DATABASE_URL: ❌ invalid URI");
  process.exit(1);
}

if (ref) {
  console.log(`Supabase project ref: ${ref}`);
} else {
  console.log("Supabase project ref: (could not parse — check DATABASE_URL format)");
}

if (prod) {
  console.log("\n❌ PRODUCTION project — blocked for local dev");
  console.log(`   Prod ref is ${PROD_SUPABASE_REF} (belongs in Vercel Dashboard only).`);
  console.log("   Put your *other* dev project credentials in .env.local.");
  process.exit(1);
}

console.log("\n✔ Dev project — OK for npm run dev / run easy");
if (ref === PROD_SUPABASE_REF) {
  process.exit(1);
}
