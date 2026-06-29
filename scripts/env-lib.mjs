import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";

export const PROD_SUPABASE_REF = "yofgnflcqajqsepbfdkc";
export const DEV_SUPABASE_REF = "dwccqrbpwbnuoiihpgth";
export const LOCAL_ENV_FILE = ".env.local";

/** Parse a .env file into a plain object — never writes to disk. */
export function loadEnv(filePath) {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) {
    return { path: fullPath, vars: {} };
  }
  const vars = parseDotenv(readFileSync(fullPath, "utf8"));
  return { path: fullPath, vars: vars ?? {} };
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

/** True when DATABASE_URL points at the production Supabase project. */
export function isProdDB(databaseUrl) {
  if (!databaseUrl) return false;
  return String(databaseUrl).includes(PROD_SUPABASE_REF);
}

/** Env for Prisma migrate — must not use transaction pooler (:6543). */
export function prismaMigrateEnv(env) {
  const direct = env.DIRECT_URL?.trim();
  if (!direct) return env;
  return { ...env, DATABASE_URL: direct };
}

/** Merge env for migrate deploy: Vercel dashboard wins; locally .env.local wins. */
export function resolveMigrateEnv(baseEnv = process.env) {
  const { vars } = loadEnv(LOCAL_ENV_FILE);
  const merged = baseEnv.VERCEL ? mergeEnv(vars, baseEnv) : mergeEnv(baseEnv, vars);
  return prismaMigrateEnv(merged);
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
