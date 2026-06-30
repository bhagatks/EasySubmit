/**
 * Validates analytics env for Vercel Production builds.
 * NEXT_PUBLIC_* values are inlined at build time — empty keys silently disable all events.
 */
export function validateAnalyticsEnv(env = process.env) {
  const read = (name) => (env[name] ?? "").trim();
  const isVercelProductionBuild = env.VERCEL === "1" && env.VERCEL_ENV === "production";

  const enabled = read("NEXT_PUBLIC_ANALYTICS_ENABLED") === "true";
  const key = read("NEXT_PUBLIC_POSTHOG_KEY");
  const host = read("NEXT_PUBLIC_POSTHOG_HOST");
  const environment = read("NEXT_PUBLIC_ANALYTICS_ENV");

  if (!isVercelProductionBuild) {
    if (enabled && !key) {
      console.warn(
        "⚠ Analytics enabled locally but NEXT_PUBLIC_POSTHOG_KEY is empty — PostHog will not initialize.",
      );
    }
    return { ok: true, skipped: true };
  }

  const required = [
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "NEXT_PUBLIC_ANALYTICS_ENABLED",
    "NEXT_PUBLIC_ANALYTICS_ENV",
  ];
  const missing = required.filter((name) => !read(name));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Vercel Production: missing analytics env: ${missing.join(", ")}`,
    };
  }

  if (!enabled) {
    return {
      ok: false,
      message: "Vercel Production: NEXT_PUBLIC_ANALYTICS_ENABLED must be true.",
    };
  }

  if (!/^phc_[a-zA-Z0-9]+$/.test(key)) {
    return {
      ok: false,
      message: "Vercel Production: NEXT_PUBLIC_POSTHOG_KEY must be a PostHog project key (phc_…).",
    };
  }

  if (!/^https:\/\//.test(host)) {
    return { ok: false, message: "Vercel Production: NEXT_PUBLIC_POSTHOG_HOST is invalid." };
  }

  if (environment !== "prod") {
    return {
      ok: false,
      message: `Vercel Production: NEXT_PUBLIC_ANALYTICS_ENV must be "prod" (got "${environment}").`,
    };
  }

  return { ok: true, skipped: false };
}

/** Pulled Vercel Production env (admin / prod:health) — not a build context. */
export function validateAnalyticsEnvForDeploy(env = process.env) {
  const read = (name) => (env[name] ?? "").trim();
  const enabled = read("NEXT_PUBLIC_ANALYTICS_ENABLED") === "true";
  if (!enabled) {
    return { ok: false, message: "NEXT_PUBLIC_ANALYTICS_ENABLED must be true in Vercel Production" };
  }
  const key = read("NEXT_PUBLIC_POSTHOG_KEY");
  if (!/^phc_[a-zA-Z0-9]+$/.test(key)) {
    return {
      ok: false,
      message: "NEXT_PUBLIC_POSTHOG_KEY missing or invalid in Vercel Production",
    };
  }
  if (read("NEXT_PUBLIC_ANALYTICS_ENV") !== "prod") {
    return { ok: false, message: 'NEXT_PUBLIC_ANALYTICS_ENV must be "prod" in Vercel Production' };
  }
  if (!read("NEXT_PUBLIC_POSTHOG_HOST")) {
    return { ok: false, message: "NEXT_PUBLIC_POSTHOG_HOST missing in Vercel Production" };
  }
  return { ok: true };
}

import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

function main() {
  const result = validateAnalyticsEnv();
  if (!result.ok) {
    console.error(`❌ ${result.message}`);
    if (result.message?.includes("NEXT_PUBLIC_POSTHOG_KEY")) {
      console.error("   Set the prod project key (PostHog 488042) in Vercel → Production env.");
      console.error("   npm run vercel:sync-analytics  OR  npm run prod:repair-analytics");
      console.error("   Then redeploy with build cache disabled (--force).");
    }
    process.exit(1);
  }
  if (!result.skipped) {
    console.log("✔ Analytics env validated for Vercel Production");
  }
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href;
if (isDirectRun) {
  main();
}
