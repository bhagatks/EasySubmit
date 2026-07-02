#!/usr/bin/env node
/**
 * Prod DB + avatar storage health check.
 * Run: npm run prod:health  (Vercel Production env only — never .env.local)
 */
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractSupabaseRef,
  isProdDB,
  loadEphemeralVercelProductionEnv,
} from "./env-lib.mjs";
import { validateAnalyticsEnvForDeploy } from "./validate-analytics-env.mjs";

const MIGRATIONS_DIR = resolve(process.cwd(), "prisma/migrations");
const AVATAR_BUCKET = "avatars";

let prodOverlay = {};
try {
  prodOverlay = loadEphemeralVercelProductionEnv(process.cwd());
} catch {
  // vercel env run may still supply production vars
}

function productionEnv() {
  const vercelInjected = isProdDB(process.env.DATABASE_URL) ? process.env : {};
  const source = prodOverlay.DATABASE_URL ? prodOverlay : vercelInjected;

  if (!source.DATABASE_URL) {
    return null;
  }

  return {
    DATABASE_URL: source.DATABASE_URL,
    DIRECT_URL: source.DIRECT_URL ?? source.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_POSTHOG_KEY: source.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: source.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_ANALYTICS_ENABLED: source.NEXT_PUBLIC_ANALYTICS_ENABLED,
    NEXT_PUBLIC_ANALYTICS_ENV: source.NEXT_PUBLIC_ANALYTICS_ENV,
    SUPABASE_SERVICE_ROLE_KEY:
      source.SUPABASE_SERVICE_ROLE_KEY ?? source.SUPABASE_SECRET_KEY,
  };
}

function localMigrationNames() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d/.test(name))
    .sort();
}

/** Session pooler (5432) exhausts quickly; use transaction pooler for one-off checks. */
function toMigrationDatabaseUrl(poolerUrl) {
  const normalized = poolerUrl.replace(/^postgresql:/, "http:");
  const url = new URL(normalized);
  url.port = "6543";
  url.searchParams.set("pgbouncer", "true");
  url.searchParams.set("connection_limit", "1");
  return url.toString().replace(/^http:/, "postgresql:");
}

async function queryDb(databaseUrl, sql, params = []) {
  const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 15_000 });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

const deployEnv = productionEnv();
if (!deployEnv?.DATABASE_URL) {
  console.error("❌ Production DATABASE_URL missing — laptop .env.local is not used for prod:health.");
  console.error("   → Run: npm run prod:health  (uses vercel env run + ephemeral pull)");
  console.error("   → Vercel → Production → DATABASE_URL / DIRECT_URL");
  process.exit(1);
}

const ref = extractSupabaseRef(deployEnv);
console.log(`→ Prod health target: ${ref ?? "unknown ref"} (Vercel only)\n`);

const databaseUrl = deployEnv.DATABASE_URL;
const migrationUrl = toMigrationDatabaseUrl(deployEnv.DIRECT_URL?.trim() || databaseUrl);
const localMigrations = localMigrationNames();

console.log("━━━ EasySubmit prod health check ━━━\n");

const applied = await queryDb(
  migrationUrl,
  `SELECT migration_name, finished_at IS NOT NULL AS applied, rolled_back_at IS NOT NULL AS rolled_back
   FROM "_prisma_migrations"
   ORDER BY migration_name`,
);
const appliedNames = new Set(
  applied.rows.filter((row) => row.applied && !row.rolled_back).map((row) => row.migration_name),
);

const missing = localMigrations.filter((name) => !appliedNames.has(name));
const extra = [...appliedNames].filter((name) => !localMigrations.includes(name)).sort();

console.log(`Migrations in repo: ${localMigrations.length}`);
console.log(`Applied in prod DB: ${appliedNames.size}`);
if (missing.length > 0) {
  console.log("\n❌ Missing in prod (redeploy — vercel-build runs migrate deploy):");
  for (const name of missing) console.log(`   - ${name}`);
} else {
  console.log("✔ All repo migrations applied in prod");
}
if (extra.length > 0) {
  console.log("\n⚠ Applied in prod but not in local repo:");
  for (const name of extra) console.log(`   - ${name}`);
}

const userCols = await queryDb(
  migrationUrl,
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'users'
   ORDER BY column_name`,
);
const colNames = userCols.rows.map((row) => row.column_name);
const requiredUserCols = ["planConfirmedAt", "plan", "subscriptionStatus", "stripeCustomerId"];
const missingCols = requiredUserCols.filter((col) => !colNames.includes(col));
console.log("\nUser columns:");
if (missingCols.length === 0) {
  console.log(`✔ Required billing/onboarding cols present (${requiredUserCols.join(", ")})`);
} else {
  console.log(`❌ Missing columns: ${missingCols.join(", ")}`);
}

let bucketRow = null;
try {
  const buckets = await queryDb(
    migrationUrl,
    `SELECT id, name, public FROM storage.buckets WHERE id = $1`,
    [AVATAR_BUCKET],
  );
  bucketRow = buckets.rows[0] ?? null;
} catch (error) {
  console.log(`\n❌ Could not read storage.buckets: ${error instanceof Error ? error.message : error}`);
}

console.log("\nAvatar storage bucket:");
if (bucketRow) {
  console.log(`✔ "${AVATAR_BUCKET}" exists (public=${bucketRow.public})`);
} else {
  console.log(`❌ "${AVATAR_BUCKET}" bucket missing — run npm run prod:ensure-avatars-bucket`);
}

const analytics = validateAnalyticsEnvForDeploy(deployEnv);
console.log("\nPostHog analytics (Vercel Production env):");
if (analytics.ok) {
  console.log("✔ NEXT_PUBLIC_POSTHOG_KEY and related vars configured");
} else {
  console.log(`❌ ${analytics.message}`);
  console.log("   → npm run prod:repair-analytics");
}

const supabaseUrl = deployEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = deployEnv.SUPABASE_SERVICE_ROLE_KEY;

console.log("\nSupabase admin credentials (Vercel Production):");
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "set" : "❌ missing"}`);
console.log(`   Service role / secret key: ${serviceRoleKey ? "set" : "❌ missing"}`);

if (supabaseUrl && serviceRoleKey) {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const probePath = `health-check/${Date.now()}.txt`;
  const { error: uploadError } = await admin.storage.from(AVATAR_BUCKET).upload(probePath, "ok", {
    contentType: "text/plain",
    upsert: true,
  });
  if (uploadError) {
    console.log(`\n❌ Storage upload probe failed: ${uploadError.message}`);
  } else {
    await admin.storage.from(AVATAR_BUCKET).remove([probePath]);
    console.log("\n✔ Storage upload probe succeeded");
  }
} else {
  console.log("\n❌ Cannot probe storage upload — set SUPABASE_SERVICE_ROLE_KEY in Vercel Production");
  console.log("   Supabase → Project Settings → API → service_role (secret)");
}

const failed = await queryDb(
  migrationUrl,
  `SELECT migration_name, logs FROM "_prisma_migrations"
   WHERE rolled_back_at IS NOT NULL
   ORDER BY migration_name`,
);
if (failed.rows.length > 0) {
  console.log("\n❌ Failed / incomplete migrations in _prisma_migrations:");
  for (const row of failed.rows) {
    console.log(`   - ${row.migration_name}`);
  }
}

console.log("");
const hasBlockers =
  missing.length > 0 ||
  missingCols.length > 0 ||
  !bucketRow ||
  !serviceRoleKey ||
  !analytics.ok ||
  failed.rows.length > 0;
process.exit(hasBlockers ? 1 : 0);
