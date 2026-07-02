#!/usr/bin/env node
/**
 * Bootstrap PostHog dashboards for dev + prod projects.
 * Requires POSTHOG_PERSONAL_API_KEY (phx_...) with project write access.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPostHogOnlyEnv, resolveAnalyticsAdminEnv } from "./env-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const adminEnv = resolveAnalyticsAdminEnv(process.env);
assertPostHogOnlyEnv(adminEnv, "posthog-setup-dashboards");
const apiKey = adminEnv.POSTHOG_PERSONAL_API_KEY;
const host = adminEnv.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const apiHost = host.replace("us.i.posthog.com", "us.posthog.com");

const projects = [
  { label: "dev", id: adminEnv.POSTHOG_DEV_PROJECT_ID ?? "488025" },
  { label: "prod", id: adminEnv.POSTHOG_PROD_PROJECT_ID ?? "488042" },
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
  {
    name: "Resume journey (dev debug)",
    events: [
      "extension_job_captured",
      "resume_journey_step",
      "enhance_completed",
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

async function get(path) {
  const res = await fetch(`${apiHost}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} ${res.status}: ${text}`);
  }
  return res.json();
}

async function ensureDashboard(projectId, name) {
  const list = await get(`/api/projects/${projectId}/dashboards/`);
  const existing = list.results?.find((dashboard) => dashboard.name === name);
  if (existing) {
    return existing;
  }
  return post(`/api/projects/${projectId}/dashboards/`, {
    name,
    description: "EasySubmit Option A analytics (auto-created)",
  });
}

async function ensureFunnelInsight(projectId, dashboardId, funnel) {
  const list = await get(`/api/projects/${projectId}/insights/?search=${encodeURIComponent(funnel.name)}`);
  const existing = list.results?.find((insight) => insight.name === funnel.name);
  if (existing) {
    return existing;
  }
  return post(`/api/projects/${projectId}/insights/`, {
    name: funnel.name,
    dashboards: [dashboardId],
    query: {
      kind: "InsightVizNode",
      source: {
        kind: "FunnelsQuery",
        series: funnel.events.map((event) => ({
          kind: "EventsNode",
          event,
          name: event,
        })),
        dateRange: { date_from: "-30d" },
      },
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
    try {
      await get(`/api/projects/${project.id}/`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes(" 404:")) {
        console.warn(`  skipped — project not visible to this API key (404)`);
        continue;
      }
      throw error;
    }
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
