import { describe, expect, it } from "vitest";
import {
  DEV_SUPABASE_REF,
  PROD_SUPABASE_REF,
  SKIP_LOCAL_ENV_FLAG,
  isProdDB,
  mergeEnv,
  resolveMigrateEnvRecord,
  shouldSkipLocalEnvFile,
} from "./env-resolution.mjs";

const prodDatabaseUrl = `postgresql://postgres.${PROD_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;
const prodDirectUrl = `postgresql://postgres.${PROD_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres`;
const devDatabaseUrl = `postgresql://postgres.${DEV_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres`;
const devDirectUrl = `postgresql://postgres.${DEV_SUPABASE_REF}:secret@aws-1-us-east-1.pooler.supabase.com:5432/postgres`;

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
