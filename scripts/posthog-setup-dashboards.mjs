#!/usr/bin/env node
/**
 * Bootstrap PostHog dashboards for dev + prod projects.
 * Requires POSTHOG_PERSONAL_API_KEY (phx_...) with project write access.
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

const projects = [
  { label: "dev", id: process.env.POSTHOG_DEV_PROJECT_ID ?? "488025" },
  { label: "prod", id: process.env.POSTHOG_PROD_PROJECT_ID ?? "488042" },
];

const FUNNELS = [
  {
    name: "Onboarding funnel",
    events: [
      "login_completed",
      "onboarding_phase_completed",
      "onboarding_completed",
    ],
  },
  {
    name: "BYOK conversion",
    events: ["byok_cta_clicked", "byok_handshake_started", "byok_key_saved"],
  },
  {
    name: "Extension capture → apply",
    events: [
      "extension_popup_opened",
      "extension_card_opened",
      "extension_job_captured",
      "extension_apply_started",
    ],
  },
];

async function post(path, body) {
  const res = await fetch(`${apiHost}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text}`);
  }
  return res.json();
}

async function ensureDashboard(projectId, name) {
  return post(`/api/projects/${projectId}/dashboards/`, {
    name,
    description: "EasySubmit Option A analytics (auto-created)",
  });
}

async function ensureFunnelInsight(projectId, dashboardId, funnel) {
  return post(`/api/projects/${projectId}/insights/`, {
    name: funnel.name,
    dashboards: [dashboardId],
    filters: {
      insight: "FUNNELS",
      events: funnel.events.map((event) => ({ id: event, name: event, type: "events" })),
      funnel_viz_type: "steps",
      date_from: "-30d",
    },
  });
}

async function main() {
  if (!apiKey) {
    console.error(
      "Missing POSTHOG_PERSONAL_API_KEY. Set in .env.local and re-run: npm run analytics:setup",
    );
    process.exit(1);
  }

  for (const project of projects) {
    console.log(`\n→ Project ${project.label} (${project.id})`);
    const dashboard = await ensureDashboard(project.id, `EasySubmit — ${project.label}`);
    const dashboardId = dashboard.id;
    console.log(`  Dashboard: ${dashboardId}`);

    for (const funnel of FUNNELS) {
      const insight = await ensureFunnelInsight(project.id, dashboardId, funnel);
      console.log(`  Insight: ${insight.id} — ${funnel.name}`);
    }
  }

  console.log("\nDone. Open PostHog → Dashboards to review funnels and add replay playlists.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
