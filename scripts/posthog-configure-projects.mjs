#!/usr/bin/env node
/**
 * Apply EasySubmit PostHog project UI settings (dev + prod) via API.
 * Requires POSTHOG_PERSONAL_API_KEY (phx_…) in .env.local.
 *
 * Run: npm run analytics:configure
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

loadEnv({ path: resolve(root, ".env.local") });
loadEnv({ path: resolve(root, ".env") });

const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const apiHost = host.replace("us.i.posthog.com", "us.posthog.com");

const PROPERTY_BLOCKLIST = [
  "apiKey",
  "api_key",
  "password",
  "resumeText",
  "resume_text",
  "coverLetter",
  "cover_letter",
  "jobDescription",
  "job_description",
  "token",
  "authorization",
  "secret",
];

const projects = [
  {
    label: "dev",
    id: process.env.POSTHOG_DEV_PROJECT_ID ?? "488025",
    replaySampleRate: "1.0",
  },
  {
    label: "prod",
    id: process.env.POSTHOG_PROD_PROJECT_ID ?? "488042",
    replaySampleRate: "0.15",
  },
];

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${apiHost}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

function projectPayload({ replaySampleRate }) {
  return {
    autocapture_opt_out: false,
    autocapture_exceptions_opt_in: true,
    autocapture_web_vitals_opt_in: true,
    session_recording_opt_in: true,
    session_recording_sample_rate: replaySampleRate,
    session_recording_masking_config: {
      maskAllInputs: true,
    },
    data_attributes: PROPERTY_BLOCKLIST,
  };
}

async function main() {
  if (!apiKey) {
    console.error(
      "Missing POSTHOG_PERSONAL_API_KEY (phx_…). Add to .env.local, then: npm run analytics:configure",
    );
    process.exit(1);
  }

  console.log("━━━ PostHog project configuration ━━━\n");

  for (const project of projects) {
    console.log(`→ ${project.label} (${project.id})`);
    let current;
    try {
      current = await api(`/api/projects/${project.id}/`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes(" 404:")) {
        console.warn(`  skipped — project not visible to this API key (404)`);
        continue;
      }
      throw error;
    }
    const updated = await api(`/api/projects/${project.id}/`, {
      method: "PATCH",
      body: projectPayload(project),
    });

    console.log(`  autocapture: ${updated.autocapture_opt_out === false ? "on" : "off"}`);
    console.log(`  error tracking: ${updated.autocapture_exceptions_opt_in ? "on" : "off"}`);
    console.log(`  session replay: ${updated.session_recording_opt_in ? "on" : "off"}`);
    console.log(
      `  replay sample: ${updated.session_recording_sample_rate ?? current.session_recording_sample_rate}`,
    );
    console.log(
      `  input masking: ${updated.session_recording_masking_config?.maskAllInputs ? "on" : "check UI"}`,
    );
  }

  console.log("\n✔ PostHog UI settings applied (dev 100% replay, prod 15% replay)");
  console.log("  Client-side property sanitization: src/shared/analytics/sanitize.ts");
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
