#!/usr/bin/env node
/**
 * One-shot repair: sync analytics env to Vercel Production, force redeploy, verify bundle.
 * Key source (first match): NEXT_PUBLIC_POSTHOG_KEY env → EXTENSION_POSTHOG_KEY env.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function findPhcInJsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findPhcInJsFiles(path);
      if (nested) return nested;
      continue;
    }
    if (!entry.name.endsWith(".js")) continue;
    const match = readFileSync(path, "utf8").match(/phc_[a-zA-Z0-9]+/);
    if (match) return match[0];
  }
  return null;
}

function findPhcInPopupBundle(dir) {
  const popupPath = join(dir, "popup", "popup.js");
  if (!existsSync(popupPath)) return null;
  const match = readFileSync(popupPath, "utf8").match(/NEXT_PUBLIC_POSTHOG_KEY:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function resolvePosthogKey() {
  const fromEnv = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.EXTENSION_POSTHOG_KEY ?? "").trim();
  if (fromEnv) return fromEnv;

  const artifactDir = process.env.EXTENSION_ARTIFACT_DIR?.trim();
  if (artifactDir && existsSync(artifactDir)) {
    const fromPopup = findPhcInPopupBundle(artifactDir);
    if (fromPopup) return fromPopup;
    const fromArtifact = findPhcInJsFiles(artifactDir);
    if (fromArtifact) return fromArtifact;
  }

  console.error("❌ No PostHog project key found.");
  console.error("   Set NEXT_PUBLIC_POSTHOG_KEY or EXTENSION_POSTHOG_KEY, then re-run:");
  console.error("   npm run prod:repair-analytics");
  process.exit(1);
}

const key = resolvePosthogKey();
if (!/^phc_[a-zA-Z0-9]+$/.test(key)) {
  console.error("❌ PostHog key must match phc_…");
  process.exit(1);
}

console.log("━━━ Repair prod PostHog (Vercel) ━━━\n");
console.log("→ Syncing analytics env to Vercel Production");

run(process.execPath, [resolve(root, "scripts/sync-vercel-analytics-env.mjs")], {
  env: {
    ...process.env,
    NEXT_PUBLIC_POSTHOG_KEY: key,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
    NEXT_PUBLIC_ANALYTICS_ENV: "prod",
    NEXT_PUBLIC_POSTHOG_AUTOCAPTURE: process.env.NEXT_PUBLIC_POSTHOG_AUTOCAPTURE ?? "true",
  },
});

console.log("\n→ Force redeploy (no build cache)");
run("npx", ["vercel", "deploy", "--prod", "--yes", "--force"]);

console.log("\n→ Verify PostHog in live bundle");
run(process.execPath, [resolve(root, "scripts/verify-prod-posthog-live.mjs")]);

console.log("\n✔ Prod PostHog repair complete");
