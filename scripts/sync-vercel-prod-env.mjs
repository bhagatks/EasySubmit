#!/usr/bin/env node
/**
 * Push vars from .env.prod.local to Vercel Production (non-interactive).
 * Run: node scripts/sync-vercel-prod-env.mjs
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadProdLocalEnv } from "./prod-local-env.mjs";

const REQUIRED_KEYS = ["DATABASE_URL", "DIRECT_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"];
const OPTIONAL_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_ANALYTICS_ENABLED",
  "NEXT_PUBLIC_ANALYTICS_ENV",
  "NEXT_PUBLIC_POSTHOG_AUTOCAPTURE",
  "LOG_LEVEL",
];

const root = process.cwd();
if (!existsSync(resolve(root, ".vercel/project.json"))) {
  console.log("→ Linking Vercel project");
  execSync("npx vercel link --yes", { stdio: "inherit", cwd: root });
}

const { path: prodEnvPath, vars } = loadProdLocalEnv(root);
const missingRequired = REQUIRED_KEYS.filter((key) => !vars[key]?.trim());
if (missingRequired.length > 0) {
  console.error(`❌ Missing in ${prodEnvPath}: ${missingRequired.join(", ")}`);
  process.exit(1);
}

const toSync = [
  ...REQUIRED_KEYS,
  ...OPTIONAL_KEYS.filter((key) => vars[key]?.trim()),
];

function upsertEnv(key, value) {
  try {
    execSync(`npx vercel env rm ${key} production --yes`, { stdio: "pipe", cwd: root });
  } catch {
    // not set yet
  }
  const result = spawnSync("npx", ["vercel", "env", "add", key, "production"], {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    cwd: root,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("━━━ Sync .env.prod.local → Vercel Production ━━━\n");
for (const key of toSync) {
  console.log(`→ ${key}`);
  upsertEnv(key, vars[key].trim());
}
console.log("\n✔ Vercel Production env synced — redeploy for changes to apply");
