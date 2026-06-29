#!/usr/bin/env node
/**
 * Prod cutover helper: sync Vercel env → repair P3009 → migrate → avatars → deploy.
 * Run: node scripts/prod-cutover.mjs
 */
import { execSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeEnv } from "./env-lib.mjs";
import { loadProdLocalEnv } from "./prod-local-env.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const node = process.execPath;

function run(label, command, args, options = {}) {
  console.log(`\n━━━ ${label} ━━━`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: root,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  EasySubmit · production cutover");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

run("Sync Vercel Production env", node, [resolve(root, "scripts/sync-vercel-prod-env.mjs")]);

run("Prod migration status (before)", node, [resolve(root, "scripts/prod-prisma.mjs"), "migrate", "status"]);

console.log("\n━━━ P3009 repair (mark init applied if tables exist) ━━━");
const resolveInit = spawnSync(
  node,
  [resolve(root, "scripts/prod-prisma.mjs"), "migrate", "resolve", "--applied", "20260618043606_init"],
  { stdio: "inherit", cwd: root },
);
if (resolveInit.status !== 0) {
  console.log("⚠ migrate resolve skipped or already applied — continuing");
}

run("Apply pending migrations", node, [resolve(root, "scripts/prisma-migrate-deploy-prod.mjs")]);

run("Prod migration status (after)", node, [resolve(root, "scripts/prod-prisma.mjs"), "migrate", "status"]);

run("Ensure avatars bucket", node, [resolve(root, "scripts/ensure-avatars-bucket.mjs")], {
  env: mergeEnv(process.env, loadProdLocalEnv(root).vars),
});

console.log("\n━━━ Tests ━━━");
execSync("npm test", { stdio: "inherit", cwd: root });

console.log("\n━━━ Deploy Vercel production ━━━");
execSync("npx vercel deploy --prod", { stdio: "inherit", cwd: root });

console.log("\n✔ Cutover complete — smoke test https://www.easysubmit.ai/login");
