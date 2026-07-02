/** Shared env precedence for Prisma CLI + migrate wrappers (importable from .mjs and prisma.config.ts). */

export const PROD_SUPABASE_REF = "yofgnflcqajqsepbfdkc";
export const DEV_SUPABASE_REF = "dwccqrbpwbnuoiihpgth";
export const LOCAL_ENV_FILE = ".env.local";
export const SKIP_LOCAL_ENV_FLAG = "EASYSUBMIT_SKIP_LOCAL_ENV";

/** True when DATABASE_URL points at the production Supabase project. */
export function isProdDB(databaseUrl) {
  if (!databaseUrl) return false;
  return String(databaseUrl).includes(PROD_SUPABASE_REF);
}

/**
 * When true, never load `.env.local` — injected/Vercel/CI/prod shell env is authoritative.
 * Used by prisma.config.ts and migrate wrappers so prod deploy cannot pick up laptop secrets.
 */
export function shouldSkipLocalEnvFile(env) {
  return (
    env[SKIP_LOCAL_ENV_FLAG] === "1" ||
    Boolean(env.VERCEL) ||
    isProdDB(env.DATABASE_URL) ||
    isProdDB(env.DIRECT_URL)
  );
}

/** Merge injected vars over a base env object (memory only). */
export function mergeEnv(baseEnv, injected) {
  const merged = { ...baseEnv };
  for (const [key, value] of Object.entries(injected)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      merged[key] = String(value).trim();
    }
  }
  return merged;
}

export function extractSupabaseRef(env) {
  const supabasePublicUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabasePublicUrl) {
    const m = supabasePublicUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (m?.[1]) return m[1];
  }
  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl) {
    const userMatch = databaseUrl.match(/postgres\.([^:]+):/);
    if (userMatch?.[1]) return userMatch[1];
    const hostMatch = databaseUrl.match(/db\.([^.]+)\.supabase\.co/);
    if (hostMatch?.[1]) return hostMatch[1];
  }
  return null;
}

/** migrate * must use session/direct host — transaction pooler :6543 hangs on advisory locks. */
export function applyMigrateDatasourceUrl(env, isMigrateCli) {
  if (!isMigrateCli) return env;
  const direct = env.DIRECT_URL?.trim();
  if (!direct) return env;
  return { ...env, DATABASE_URL: direct };
}

/**
 * Resolve env for migrate deploy.
 * @returns {{ env: Record<string, string>, remoteWins: boolean }}
 */
export function resolveMigrateEnvRecord(baseEnv, localVars) {
  const remoteWins = shouldSkipLocalEnvFile(baseEnv);
  const merged = remoteWins ? { ...baseEnv } : mergeEnv(baseEnv, localVars);
  const env = applyMigrateDatasourceUrl(merged, true);
  if (remoteWins) {
    env[SKIP_LOCAL_ENV_FLAG] = "1";
  }
  return { env, remoteWins };
}
