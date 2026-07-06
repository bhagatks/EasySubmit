import { describe, expect, it } from "vitest";
import {
  DEV_SUPABASE_REF,
  POSTHOG_ADMIN_ENV_KEYS,
  PROD_SUPABASE_REF,
  SKIP_LOCAL_ENV_FLAG,
  assertPostHogOnlyEnv,
  buildPostHogAdminEnv,
  isProdDB,
  mergeEnv,
  resolveMigrateEnvRecord,
  resolveProdDebugEnvRecord,
  shouldSkipLocalEnvFile,
  stripLocalDatabaseEnv,
} from "./env-resolution.mjs";

const prodDatabaseUrl = `postgresql://postgres.${PROD_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;
const prodDirectUrl = `postgresql://postgres.${PROD_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres`;
const devDatabaseUrl = `postgresql://postgres.${DEV_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;
const devDirectUrl = `postgresql://postgres.${DEV_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres`;

describe("buildPostHogAdminEnv", () => {
  it("never includes DATABASE_URL even when process.env and .env.local have them", () => {
    const env = buildPostHogAdminEnv(
      {
        PATH: "/usr/bin",
        DATABASE_URL: prodDatabaseUrl,
        DIRECT_URL: prodDirectUrl,
      },
      {
        DATABASE_URL: devDatabaseUrl,
        DIRECT_URL: devDirectUrl,
        POSTHOG_PERSONAL_API_KEY: "phx_test_key",
        POSTHOG_DEV_PROJECT_ID: "488025",
      },
    );
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.DIRECT_URL).toBeUndefined();
    expect(env.POSTHOG_PERSONAL_API_KEY).toBe("phx_test_key");
    expect(env.PATH).toBe("/usr/bin");
  });

  it("ignores non-allowlisted keys from .env.local", () => {
    const env = buildPostHogAdminEnv(
      {},
      {
        NEXTAUTH_SECRET: "should-not-appear",
        POSTHOG_PERSONAL_API_KEY: "phx_ok",
      },
    );
    expect(env.NEXTAUTH_SECRET).toBeUndefined();
    expect(env.POSTHOG_PERSONAL_API_KEY).toBe("phx_ok");
  });
});

describe("assertPostHogOnlyEnv", () => {
  it("throws when DATABASE_URL is present", () => {
    expect(() => assertPostHogOnlyEnv({ DATABASE_URL: devDatabaseUrl })).toThrow(/DATABASE_URL/);
  });
});

describe("shouldSkipLocalEnvFile", () => {
  it("skips when Vercel build env is present", () => {
    expect(shouldSkipLocalEnvFile({ VERCEL: "1" })).toBe(true);
  });

  it("skips when prod DATABASE_URL is injected", () => {
    expect(shouldSkipLocalEnvFile({ DATABASE_URL: prodDatabaseUrl })).toBe(true);
  });

  it("skips when explicit flag is set", () => {
    expect(shouldSkipLocalEnvFile({ [SKIP_LOCAL_ENV_FLAG]: "1" })).toBe(true);
  });

  it("loads local file for plain local dev", () => {
    expect(shouldSkipLocalEnvFile({ DATABASE_URL: devDatabaseUrl })).toBe(false);
  });
});

describe("stripLocalDatabaseEnv", () => {
  it("removes laptop DB URLs before vercel env run", () => {
    const stripped = stripLocalDatabaseEnv({
      DATABASE_URL: devDatabaseUrl,
      DIRECT_URL: devDirectUrl,
      POSTHOG_PERSONAL_API_KEY: "phx_test",
    });
    expect(stripped.DATABASE_URL).toBeUndefined();
    expect(stripped.DIRECT_URL).toBeUndefined();
    expect(stripped.POSTHOG_PERSONAL_API_KEY).toBe("phx_test");
    expect(stripped[SKIP_LOCAL_ENV_FLAG]).toBe("1");
  });
});

describe("resolveMigrateEnvRecord", () => {
  const localVars = {
    DATABASE_URL: devDatabaseUrl,
    DIRECT_URL: devDirectUrl,
    NEXTAUTH_SECRET: "local-only",
  };

  it("lets vercel env run beat .env.local for migrate", () => {
    const shell = {
      DATABASE_URL: prodDatabaseUrl,
      DIRECT_URL: prodDirectUrl,
    };
    const { env, remoteWins } = resolveMigrateEnvRecord(shell, localVars);
    expect(remoteWins).toBe(true);
    expect(env.DATABASE_URL).toBe(prodDirectUrl);
    expect(env.DIRECT_URL).toBe(prodDirectUrl);
    expect(env.NEXTAUTH_SECRET).toBeUndefined();
    expect(env[SKIP_LOCAL_ENV_FLAG]).toBe("1");
  });

  it("uses local dev credentials when no remote context", () => {
    const { env, remoteWins } = resolveMigrateEnvRecord({}, localVars);
    expect(remoteWins).toBe(false);
    expect(env.DATABASE_URL).toBe(devDirectUrl);
    expect(env.DIRECT_URL).toBe(devDirectUrl);
  });
});

describe("mergeEnv", () => {
  it("does not let empty injected values clobber base", () => {
    const merged = mergeEnv({ DATABASE_URL: prodDatabaseUrl }, { DATABASE_URL: "" });
    expect(merged.DATABASE_URL).toBe(prodDatabaseUrl);
  });
});

describe("isProdDB", () => {
  it("detects prod ref in connection string", () => {
    expect(isProdDB(prodDatabaseUrl)).toBe(true);
    expect(isProdDB(devDatabaseUrl)).toBe(false);
  });
});

describe("POSTHOG_ADMIN_ENV_KEYS", () => {
  it("does not include database keys", () => {
    for (const key of POSTHOG_ADMIN_ENV_KEYS) {
      expect(key).not.toMatch(/DATABASE|DIRECT_URL|SUPABASE_SERVICE/i);
    }
  });
});

describe("resolveProdDebugEnvRecord", () => {
  it("merges prod database vars and strips laptop DB", () => {
    const { env, error } = resolveProdDebugEnvRecord(
      { DATABASE_URL: devDatabaseUrl, PATH: "/usr/bin" },
      { DATABASE_URL: prodDatabaseUrl, DIRECT_URL: prodDirectUrl, NEXTAUTH_SECRET: "nope" },
    );
    expect(error).toBeNull();
    expect(env?.DATABASE_URL).toBe(prodDatabaseUrl);
    expect(env?.DIRECT_URL).toBe(prodDirectUrl);
    expect(env?.NEXTAUTH_SECRET).toBeUndefined();
    expect(env?.[SKIP_LOCAL_ENV_FLAG]).toBe("1");
  });

  it("refuses dev DATABASE_URL in prod debug file", () => {
    const { env, error } = resolveProdDebugEnvRecord({}, { DATABASE_URL: devDatabaseUrl });
    expect(env).toBeNull();
    expect(error).toBe("not_prod_database_url");
  });
});
