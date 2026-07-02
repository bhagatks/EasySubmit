/**
 * Env domains — permanent separation of concerns.
 *
 * | Domain | Keys | Source |
 * |--------|------|--------|
 * | database | DATABASE_URL, DIRECT_URL, Supabase service keys | `run easy` / Vercel only |
 * | posthog-admin | POSTHOG_PERSONAL_API_KEY, project IDs | `.env.local` allowlist only |
 * | posthog-runtime | NEXT_PUBLIC_POSTHOG_* | `.env.local` (dev) or Vercel (prod) |
 *
 * Scripts that test/configure PostHog must use `buildPostHogAdminEnv()` —
 * never `dotenv.config(".env.local")` and never spread full `process.env`.
 *
 * Prod deploy handoff: push `main` or `run easy prod` · secrets in Vercel Dashboard only.
 * Post-deploy: `prod:smoke`, `prod:verify-posthog`, `prod:health`, optional `analytics:closeout`.
 */

export const PROD_SUPABASE_REF = "yofgnflcqajqsepbfdkc";
export const DEV_SUPABASE_REF = "dwccqrbpwbnuoiihpgth";
export const LOCAL_ENV_FILE = ".env.local";
export const SKIP_LOCAL_ENV_FLAG = "EASYSUBMIT_SKIP_LOCAL_ENV";

export const POSTHOG_ADMIN_ENV_KEYS = [
  "POSTHOG_PERSONAL_API_KEY",
  "POSTHOG_DEV_PROJECT_ID",
  "POSTHOG_PROD_PROJECT_ID",
  "NEXT_PUBLIC_POSTHOG_HOST",
];

const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
];

/** True when DATABASE_URL points at the production Supabase project. */
export function isProdDB(databaseUrl) {
  if (!databaseUrl) return false;
  return String(databaseUrl).includes(PROD_SUPABASE_REF);
}

/**
 * When true, never load `.env.local` — injected/Vercel/CI/prod shell env is authoritative.
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

/** Pick PostHog admin keys from `.env.local` — never database URLs. */
export function loadLocalAnalyticsAdminVars(localVars) {
  const picked = {};
  for (const key of POSTHOG_ADMIN_ENV_KEYS) {
    if (localVars[key] !== undefined && localVars[key] !== null) {
      picked[key] = String(localVars[key]).trim();
    }
  }
  return picked;
}

/**
 * PostHog admin env — strips database keys from shell, merges allowlisted local keys only.
 */
export function buildPostHogAdminEnv(baseEnv, localVars = {}) {
  const env = { ...baseEnv };
  for (const key of DATABASE_ENV_KEYS) {
    delete env[key];
  }
  return mergeEnv(env, loadLocalAnalyticsAdminVars(localVars));
}

export function assertPostHogOnlyEnv(env, context = "PostHog admin") {
  for (const key of DATABASE_ENV_KEYS) {
    if (env[key]) {
      throw new Error(`${context}: ${key} must not be set in PostHog admin env`);
    }
  }
}

/** Strip laptop DB URLs before `vercel env run` so prod credentials are authoritative. */
export function stripLocalDatabaseEnv(env) {
  const stripped = { ...env };
  for (const key of DATABASE_ENV_KEYS) {
    delete stripped[key];
  }
  stripped[SKIP_LOCAL_ENV_FLAG] = "1";
  return stripped;
}

/** Local dev — merge full `.env.local` over shell. */
export function resolveAppEnvRecord(baseEnv, localVars) {
  return { env: mergeEnv(baseEnv, localVars) };
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
