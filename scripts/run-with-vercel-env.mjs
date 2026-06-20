#!/usr/bin/env node
/**
 * Run a command with Vercel production env vars loaded from a temp file (never committed).
 * Usage: node scripts/run-with-vercel-env.mjs -- npx prisma migrate deploy
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

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

loadDotenv({ path: tmpFile, override: true });

if (!process.env.DATABASE_URL) {
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
