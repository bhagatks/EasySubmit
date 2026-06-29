#!/usr/bin/env node
/** prisma migrate deploy on prod via .env.prod.local */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prismaMigrateEnv } from "./env-lib.mjs";
import { assertProdDatabaseUrl, loadProdLocalEnv } from "./prod-local-env.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const { vars } = loadProdLocalEnv(root);
assertProdDatabaseUrl(vars.DATABASE_URL);
const env = prismaMigrateEnv({
  ...process.env,
  ...vars,
  EASYSUBMIT_SKIP_LOCAL_DOTENV: "1",
});

const direct = env.DIRECT_URL?.trim();
if (!direct) {
  console.error("❌ DIRECT_URL missing — add to .env.prod.local or fix DATABASE_URL password");
  process.exit(1);
}

const host = direct.match(/@([^:/]+)/)?.[1] ?? "database";
console.log(`→ prisma migrate deploy via ${host} (prod DIRECT_URL)`);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env,
  cwd: root,
});
process.exit(result.status ?? 1);
