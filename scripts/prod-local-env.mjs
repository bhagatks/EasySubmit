/**
 * Load production credentials from .env.prod.local (never committed).
 * Used for one-off prod DB ops and syncing Vercel — not for local dev.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";
import { PROD_SUPABASE_REF, mergeEnv } from "./env-lib.mjs";

export const PROD_LOCAL_ENV_FILE = ".env.prod.local";

function extractPassword(databaseUrl) {
  const m = databaseUrl?.match(/postgres\.[^:]+:([^@]+)@/);
  return m?.[1] ?? "";
}

/** Session/direct host for prisma migrate deploy on prod Supabase. */
export function deriveProdDirectUrl(databaseUrl) {
  if (!databaseUrl?.includes(PROD_SUPABASE_REF)) return "";
  const password = extractPassword(databaseUrl);
  if (!password || password === "[PASSWORD]") return "";
  return `postgresql://postgres.${PROD_SUPABASE_REF}:${password}@db.${PROD_SUPABASE_REF}.supabase.co:5432/postgres`;
}

export function loadProdLocalEnv(root = process.cwd()) {
  const path = resolve(root, PROD_LOCAL_ENV_FILE);
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${PROD_LOCAL_ENV_FILE}. Copy from .env.vercel.example and fill prod values (Supabase dashboard).`,
    );
  }
  const vars = parseDotenv(readFileSync(path, "utf8")) ?? {};
  if (!vars.DIRECT_URL?.trim()) {
    const derived = deriveProdDirectUrl(vars.DATABASE_URL);
    if (derived) vars.DIRECT_URL = derived;
  }
  return { path, vars: mergeEnv({}, vars) };
}

export function assertProdDatabaseUrl(databaseUrl) {
  if (!databaseUrl?.includes(PROD_SUPABASE_REF)) {
    throw new Error(`DATABASE_URL must target prod Supabase ${PROD_SUPABASE_REF}`);
  }
}
