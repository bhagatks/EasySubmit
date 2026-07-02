import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";
import {
  DEV_SUPABASE_REF,
  LOCAL_ENV_FILE,
  PROD_SUPABASE_REF,
  SKIP_LOCAL_ENV_FLAG,
  applyMigrateDatasourceUrl,
  extractSupabaseRef,
  isProdDB,
  mergeEnv,
  resolveMigrateEnvRecord,
  shouldSkipLocalEnvFile,
} from "../lib/env/env-resolution.mjs";

export {
  DEV_SUPABASE_REF,
  LOCAL_ENV_FILE,
  PROD_SUPABASE_REF,
  SKIP_LOCAL_ENV_FLAG,
  extractSupabaseRef,
  isProdDB,
  mergeEnv,
  resolveMigrateEnvRecord,
  shouldSkipLocalEnvFile,
};

/** Parse a .env file into a plain object — never writes to disk. */
export function loadEnv(filePath) {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) {
    return { path: fullPath, vars: {} };
  }
  const vars = parseDotenv(readFileSync(fullPath, "utf8"));
  return { path: fullPath, vars: vars ?? {} };
}

/** Append --max-old-space-size when missing (?? alone skips if NODE_OPTIONS is already set). */
export function withNodeMemoryLimit(env, megabytes = 8192) {
  const flag = `--max-old-space-size=${megabytes}`;
  const existing = env.NODE_OPTIONS?.trim() ?? "";
  if (existing.includes("max-old-space-size")) {
    return { ...env, NODE_OPTIONS: existing };
  }
  return {
    ...env,
    NODE_OPTIONS: existing ? `${existing} ${flag}` : flag,
  };
}

/** Env for Prisma migrate — must not use transaction pooler (:6543). */
export function prismaMigrateEnv(env) {
  return applyMigrateDatasourceUrl(env, true);
}

/** Merge env for migrate deploy: production/shell wins over `.env.local`. */
export function resolveMigrateEnv(baseEnv = process.env) {
  const { vars } = loadEnv(LOCAL_ENV_FILE);
  return resolveMigrateEnvRecord(baseEnv, vars).env;
}

export function runCommand(command, args, env, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    cwd: options.cwd ?? process.cwd(),
    shell: options.shell ?? false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function spawnCommand(command, args, env, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    env,
    cwd: options.cwd ?? process.cwd(),
    shell: options.shell ?? false,
  });
}

/**
 * Pull Vercel Production env to a temp file, parse into memory, delete immediately.
 * Requires `vercel link` and dashboard secrets — no local prod env file.
 */
export function loadEphemeralVercelProductionEnv(root = process.cwd()) {
  const tmpPath = join(tmpdir(), `easysubmit-vercel-${randomBytes(8).toString("hex")}.env`);
  try {
    execSync(`npx vercel env pull "${tmpPath}" --environment=production --yes`, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const content = readFileSync(tmpPath, "utf8");
    return parseDotenv(content) ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to pull Vercel Production env (ephemeral). Run \`vercel link\` and ensure secrets exist in the Vercel dashboard.\n${message}`,
    );
  } finally {
    if (existsSync(tmpPath)) {
      unlinkSync(tmpPath);
    }
  }
}
