#!/usr/bin/env node
/**
 * Repair .env.local when prod DATABASE_URL was pasted by mistake.
 * Dev project: dwccqrbpwbnuoiihpgth (EasySubmitQA)
 * Prod project: yofgnflcqajqsepbfdkc — Vercel only
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";

const DEV_REF = "dwccqrbpwbnuoiihpgth";
const PROD_REF = "yofgnflcqajqsepbfdkc";
const DEV_PUBLISHABLE = "sb_publishable_fOoTx2gDstimYRsdaZxEyQ_bigxIja5";
const ENV_FILE = ".env.local";

function extractPassword(databaseUrl) {
  const m = databaseUrl?.match(/postgres\.[^:]+:([^@]+)@/);
  return m?.[1] ?? "";
}

function buildDevDatabaseUrl(password) {
  return `postgresql://postgres.${DEV_REF}:${password}@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
}

function buildDevDirectUrl(password) {
  return `postgresql://postgres.${DEV_REF}:${password}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`;
}

const path = resolve(process.cwd(), ENV_FILE);
if (!existsSync(path)) {
  console.error(`❌ ${ENV_FILE} not found`);
  process.exit(1);
}

const raw = readFileSync(path, "utf8");
const lines = raw.split("\n");
const vars = parseDotenv(raw) ?? {};

const password =
  extractPassword(vars.DATABASE_URL) ||
  extractPassword(vars.DIRECT_URL) ||
  "[PASSWORD]";

const hadProd =
  vars.DATABASE_URL?.includes(PROD_REF) ||
  vars.DIRECT_URL?.includes(PROD_REF) ||
  vars.NEXT_PUBLIC_SUPABASE_URL?.includes(PROD_REF);

if (!hadProd && vars.DATABASE_URL?.includes(DEV_REF)) {
  console.log(`✔ ${ENV_FILE} already targets dev project ${DEV_REF}`);
  process.exit(0);
}

vars.DATABASE_URL = buildDevDatabaseUrl(password);
vars.DIRECT_URL = buildDevDirectUrl(password);
vars.NEXT_PUBLIC_SUPABASE_URL = `https://${DEV_REF}.supabase.co`;
if (!vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) {
  vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = DEV_PUBLISHABLE;
}
if (!vars.NEXTAUTH_URL?.trim()) {
  vars.NEXTAUTH_URL = "http://localhost:3000";
}
if (!vars.NEXT_PUBLIC_ANALYTICS_ENV?.trim()) {
  vars.NEXT_PUBLIC_ANALYTICS_ENV = "dev";
}

const keyOrder = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_JWT_SECRET",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
];

const written = new Set();
const out = [];

for (const key of keyOrder) {
  if (vars[key] !== undefined) {
    out.push(`${key}=${vars[key]}`);
    written.add(key);
  }
}

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    out.push(line);
    continue;
  }
  const eq = trimmed.indexOf("=");
  if (eq <= 0) {
    out.push(line);
    continue;
  }
  const key = trimmed.slice(0, eq).trim();
  if (written.has(key) || keyOrder.includes(key)) continue;
  out.push(line);
}

for (const [key, value] of Object.entries(vars)) {
  if (!written.has(key) && !keyOrder.includes(key)) {
    out.push(`${key}=${value}`);
    written.add(key);
  }
}

writeFileSync(path, `${out.join("\n").replace(/\n+$/, "")}\n`);
console.log(`✔ Repaired ${ENV_FILE} → dev project ${DEV_REF}`);
console.log("  DATABASE_URL host: aws-1-us-east-1.pooler.supabase.com:5432 (session)");
console.log("  DIRECT_URL host: db.dwccqrbpwbnuoiihpgth.supabase.co:5432");
if (password === "[PASSWORD]") {
  console.warn("⚠ DATABASE_URL still has [PASSWORD] — paste dev DB password from Supabase Dashboard");
} else if (hadProd) {
  console.warn("⚠ Kept existing DB password — if dev login fails, reset password in EasySubmitQA Supabase");
}
console.log("  Run: npm run env:whoami && npm run dev");
