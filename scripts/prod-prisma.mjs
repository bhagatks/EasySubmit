#!/usr/bin/env node
/**
 * Run Prisma CLI against prod using .env.prod.local (never .env.local).
 * Run: node scripts/prod-prisma.mjs migrate status
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prismaMigrateEnv } from "./env-lib.mjs";
import { assertProdDatabaseUrl, loadProdLocalEnv } from "./prod-local-env.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prod-prisma.mjs <prisma-args...>");
  process.exit(1);
}

const { vars } = loadProdLocalEnv(root);
assertProdDatabaseUrl(vars.DATABASE_URL);
const env = prismaMigrateEnv({
  ...process.env,
  ...vars,
  EASYSUBMIT_SKIP_LOCAL_DOTENV: "1",
});

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env,
  cwd: root,
});
process.exit(result.status ?? 1);
