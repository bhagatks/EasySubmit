#!/usr/bin/env node
/**
 * Run a command with Vercel production env vars loaded from a temp file (never committed).
 * Usage: node scripts/run-with-vercel-env.mjs -- npx prisma migrate deploy
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const tmpFile = resolve(root, ".env.vercel.deploy.tmp");
const sep = process.argv.indexOf("--");
const cmd = sep >= 0 ? process.argv.slice(sep + 1) : process.argv.slice(2);

if (cmd.length === 0) {
  console.error("Usage: node scripts/run-with-vercel-env.mjs -- <command> [args...]");
  process.exit(1);
}

function vercelCmd() {
  try {
    execSync("vercel --version", { stdio: "ignore" });
    return "vercel";
  } catch {
    return "npx vercel";
  }
}

function cleanup() {
  if (existsSync(tmpFile)) {
    unlinkSync(tmpFile);
  }
}

/** Apply only non-empty values — Vercel pull may include blank DATABASE_URL placeholders. */
function applyVercelEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  let applied = 0;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!value) continue;
    process.env[key] = value;
    applied += 1;
  }
  return applied;
}

try {
  execSync(`${vercelCmd()} env pull "${tmpFile}" --environment=production --yes`, {
    stdio: "inherit",
    cwd: root,
  });
} catch {
  console.error("❌ Failed to pull production env from Vercel.");
  console.error("   Run: vercel login && vercel link");
  cleanup();
  process.exit(1);
}

if (!existsSync(tmpFile)) {
  console.error("❌ Vercel env pull did not create a temp env file.");
  process.exit(1);
}

const applied = applyVercelEnvFile(tmpFile);
console.log(`→ Loaded ${applied} non-empty production env vars from Vercel`);

if (!process.env.DATABASE_URL?.trim()) {
  const fallback =
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (fallback) {
    process.env.DATABASE_URL = fallback;
    console.log("→ DATABASE_URL unset in Vercel; using POSTGRES_PRISMA_URL fallback");
  }
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("❌ DATABASE_URL missing in Vercel production env.");
  console.error("   Set it in Vercel → Project → Settings → Environment Variables.");
  cleanup();
  process.exit(1);
}

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: "inherit",
  env: process.env,
  cwd: root,
});

cleanup();
process.exit(result.status ?? 1);
