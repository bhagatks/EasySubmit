#!/usr/bin/env node
/**
 * Push analytics env to Vercel Production (values from process.env only — never logged).
 *
 * Usage (prod PostHog key from PostHog project 488042 or GitHub secret EXTENSION_POSTHOG_KEY):
 *   NEXT_PUBLIC_POSTHOG_KEY=phc_… npm run vercel:sync-analytics
 *
 * Or with all vars explicit:
 *   NEXT_PUBLIC_POSTHOG_KEY=phc_… \
 *   NEXT_PUBLIC_ANALYTICS_ENABLED=true \
 *   NEXT_PUBLIC_ANALYTICS_ENV=prod \
 *   npm run vercel:sync-analytics
 */
import { spawnSync } from "node:child_process";

const PRODUCTION = "production";

const VARS = {
  NEXT_PUBLIC_POSTHOG_KEY: {
    required: true,
    validate: (v) => /^phc_[a-zA-Z0-9]+$/.test(v),
    hint: "PostHog project API key (phc_…) for project 488042",
  },
  NEXT_PUBLIC_POSTHOG_HOST: {
    required: true,
    default: "https://us.i.posthog.com",
    validate: (v) => /^https:\/\//.test(v),
  },
  NEXT_PUBLIC_ANALYTICS_ENABLED: {
    required: true,
    default: "true",
    validate: (v) => v === "true",
  },
  NEXT_PUBLIC_ANALYTICS_ENV: {
    required: true,
    default: "prod",
    validate: (v) => v === "prod",
  },
  NEXT_PUBLIC_POSTHOG_AUTOCAPTURE: {
    required: false,
    default: "true",
    validate: (v) => v === "true" || v === "false",
  },
};

function readValue(name, spec) {
  const raw = (process.env[name] ?? spec.default ?? "").trim();
  if (!raw && spec.required) {
    console.error(`❌ Missing ${name} — ${spec.hint ?? "set in environment"}`);
    process.exit(1);
  }
  if (raw && spec.validate && !spec.validate(raw)) {
    console.error(`❌ Invalid ${name}`);
    process.exit(1);
  }
  return raw;
}

function vercel(args, input) {
  const result = spawnSync("npx", ["vercel", ...args], {
    stdio: ["pipe", "inherit", "inherit"],
    input,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function upsertEnv(name, value) {
  console.log(`→ ${name} (Production)`);
  vercel(["env", "rm", name, PRODUCTION, "--yes"]);
  const args = ["env", "add", name, PRODUCTION, "--force", "--no-sensitive", "--yes"];
  if (value.includes("\n")) {
    vercel(args, `${value}\n`);
  } else {
    vercel([...args, "--value", value]);
  }
}

console.log("━━━ Sync analytics env → Vercel Production ━━━\n");

const resolved = {};
for (const [name, spec] of Object.entries(VARS)) {
  resolved[name] = readValue(name, spec);
}

for (const [name, value] of Object.entries(resolved)) {
  if (!value) continue;
  upsertEnv(name, value);
}

console.log("\n✔ Analytics env synced — redeploy production with build cache disabled:");
console.log("  npx vercel deploy --prod --yes --force");
