#!/usr/bin/env node
/**
 * One-shot PostHog closeout: configure project UI + create dashboards.
 * Requires POSTHOG_PERSONAL_API_KEY (phx_…) in .env.local.
 *
 * Run: npm run analytics:closeout
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPostHogOnlyEnv, resolveAnalyticsAdminEnv } from "./env-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const adminEnv = resolveAnalyticsAdminEnv(process.env);
assertPostHogOnlyEnv(adminEnv, "analytics-closeout");

function run(scriptName) {
  const scriptPath = resolve(root, "scripts", scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: "inherit",
    env: adminEnv,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("━━━ PostHog analytics closeout (PostHog keys only — no DATABASE_URL) ━━━\n");
run("posthog-configure-projects.mjs");
run("posthog-setup-dashboards.mjs");
console.log("\n✔ Analytics closeout complete");
