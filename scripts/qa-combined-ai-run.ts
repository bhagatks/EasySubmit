#!/usr/bin/env npx tsx
/**
 * Combined BYOK + system AI QA — one job case, deduplicated scenarios.
 *
 *   npx tsx scripts/qa-combined-ai-run.ts --email bhagathsiddi@gmail.com --case 002
 *   npx tsx scripts/qa-combined-ai-run.ts --email bhagathsiddi@gmail.com --providers anthropic --skip-system
 */
import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import {
  ENHANCE_QA_BASE_FORM,
  ENHANCE_QA_CASES,
  type EnhanceQaCaseId,
} from "@/lib/job-tracker/enhance/enhance-qa-fixtures";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

type RowStatus = "pass" | "fail" | "skip";

type QaRow = {
  group: "gate" | "byok-tier" | "byok-pipeline" | "system-pipeline" | "system-smoke";
  id: string;
  label: string;
  status: RowStatus;
  notes: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
};

function parseArgs() {
  const emailArg = process.argv.indexOf("--email");
  const email =
    emailArg >= 0 ? process.argv[emailArg + 1] : process.env.ENHANCE_QA_EMAIL;
  const caseArg = process.argv.indexOf("--case");
  const caseId = (
    caseArg >= 0 ? process.argv[caseArg + 1] : "002"
  ) as EnhanceQaCaseId;
  const outArg = process.argv.indexOf("--out");
  const outPath =
    outArg >= 0
      ? process.argv[outArg + 1]!
      : join(process.cwd(), ".tmp-debug", "qa-combined-ai-run.json");
  const skipLive = process.argv.includes("--skip-live");
  const skipSystem = process.argv.includes("--skip-system");
  const providersArg = process.argv.indexOf("--providers");
  const providerFilter =
    providersArg >= 0
      ? new Set(
          process.argv[providersArg + 1]!
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : null;
  const skipProvidersArg = process.argv.indexOf("--skip-providers");
  const skipProviders =
    skipProvidersArg >= 0
      ? new Set(
          process.argv[skipProvidersArg + 1]!
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : new Set<string>();
  return { email, caseId, outPath, skipLive, skipSystem, providerFilter, skipProviders };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const { email, caseId, outPath, skipLive, skipSystem, providerFilter, skipProviders } =
    parseArgs();
  if (!email) {
    console.error("Pass --email or ENHANCE_QA_EMAIL");
    process.exit(1);
  }
  if (!ENHANCE_QA_CASES[caseId]) {
    console.error(`Unknown case ${caseId}`);
    process.exit(1);
  }

  const { prisma } = await import("@/lib/prisma");
  const { SYSTEM_QUOTA_USER_SELECT } = await import("@/lib/ai/system-quota-gate-for-user");
  const { resolveEnhanceFeature } = await import("@/lib/features/resolve-enhance");
  const { getAppConfig } = await import("@/src/lib/services/config-service");
  const { getFeatureFlags } = await import("@/src/lib/services/feature-flags-service");
  const { isAiGloballyEnabled } = await import("@/lib/ai/ai-global-enabled");
  const { isHandshakeProvider } = await import("@/src/lib/config/career-grade-models");

  const user = await prisma.user.findUnique({
    where: { email },
    select: SYSTEM_QUOTA_USER_SELECT,
  });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const vaultedAll = await prisma.userApiKey.findMany({
    where: { userId: user.id },
    select: { id: true, provider: true, vaultSecretId: true, modelHealth: true },
    orderBy: { provider: "asc" },
  });

  const vaulted = vaultedAll.filter((key) => {
    if (skipProviders.has(key.provider)) return false;
    if (providerFilter && !providerFilter.has(key.provider)) return false;
    return true;
  });

  const systemKeys = await prisma.systemApiKey.findMany({
    select: { slot: true, label: true, enabled: true, provider: true },
    orderBy: { slot: "asc" },
  });

  const [flags, aiEngine] = await Promise.all([getFeatureFlags(), getAppConfig("aiEngine")]);
  const qaCase = ENHANCE_QA_CASES[caseId];
  const rows: QaRow[] = [];

  console.log(`\nQA combined run — ${email} — case ${caseId} (${qaCase.domain})\n`);
  console.log("Config:", {
    systemAiFlag: flags.systemAiEnabled,
    enhanceFlag: flags.enhanceWithAiResumeProfile,
    aiEngineEnabled: aiEngine.enabled,
    byokCount: vaulted.length,
    systemKeySlots: systemKeys.map((k) => `${k.slot}:${k.provider}`),
  });
  console.log("BYOK providers:", vaulted.map((k) => k.provider).join(", ") || "(none)\n");

  function push(row: QaRow) {
    rows.push(row);
    const icon = row.status === "pass" ? "PASS" : row.status === "skip" ? "SKIP" : "FAIL";
    console.log(`${icon} [${row.group}] ${row.id} — ${row.notes}`);
  }

  async function gateCheck(
    id: string,
    label: string,
    userPatch: Partial<SystemQuotaUserRow>,
    expectAiAvailable: boolean,
    opts?: { forceAiEnabled?: boolean; forceSystem?: boolean },
  ) {
    const resolution = await resolveEnhanceFeature(
      { ...user, ...userPatch },
      "job_apply",
      opts,
    );
    const pass = resolution.aiAvailable === expectAiAvailable;
    push({
      group: "gate",
      id,
      label,
      status: pass ? "pass" : "fail",
      notes: `aiAvailable=${resolution.aiAvailable} reason=${resolution.reason ?? "-"} mode=${resolution.mode ?? "-"}`,
    });
  }

  // ── Gates (combined — no pipeline) ─────────────────────────────────────────
  await gateCheck("G-combined-off", "user AI disabled", { aiSourcePreference: "disabled" }, false);
  await gateCheck("G-combined-system-off", "user systemAiEnabled=false, no vault", {
    systemAiEnabled: false,
    vaultKeyId: null,
    activeProvider: null,
  }, false);

  if (user.vaultKeyId) {
    await gateCheck("G-byok-customer", "BYOK customer preference", {
      aiSourcePreference: "customer",
      vaultKeyId: user.vaultKeyId,
      activeProvider: user.activeProvider,
    }, true);
  } else {
    push({
      group: "gate",
      id: "G-byok-customer",
      label: "BYOK customer preference",
      status: "skip",
      notes: "no vaultKeyId on user",
    });
  }

  await gateCheck("G-dev-force-system", "dev forceSystem bypass", { aiSourcePreference: "disabled" }, true, {
    forceAiEnabled: true,
    forceSystem: true,
  });

  push({
    group: "gate",
    id: "G-config-snapshot",
    label: "live config",
    status: "pass",
    notes: `systemFlag=${flags.systemAiEnabled} aiEngine=${aiEngine.enabled} globalAi=${isAiGloballyEnabled()}`,
  });

  if (skipLive) {
    writeReport(outPath, { email, userId: user.id, caseId, rows, skipLive: true });
    return;
  }

  // ── BYOK tier routing (no full enhance) ────────────────────────────────────
  const { loadProviderModelHealth } = await import("@/lib/ai/model-health/resolve-model-candidates");
  const { resolveCandidatesFromHealthForTask } = await import(
    "@/lib/ai/model-health/model-candidate-ranking"
  );
  const { resolveByokTaskRoute } = await import("@/lib/ai/model-health/resolve-byok-task-route");

  for (const key of vaulted) {
    if (!isHandshakeProvider(key.provider)) continue;
    const started = Date.now();
    const health = await loadProviderModelHealth(user.id, key.provider);
    if (!health) {
      push({
        group: "byok-tier",
        id: `B-tier-${key.provider}`,
        label: `${key.provider} model health`,
        status: "fail",
        notes: "no modelHealth stored — run npm run model-health:refresh",
        durationMs: Date.now() - started,
      });
      continue;
    }
    const cheap = resolveCandidatesFromHealthForTask(key.provider, health, "cheap");
    const flagship = resolveCandidatesFromHealthForTask(key.provider, health, "flagship");
    const baseRoute = {
      mode: "customer" as const,
      provider: key.provider,
      modelId: cheap.primaryModelId,
      modelCandidates: cheap.rankedModels,
      vaultKeyId: key.vaultSecretId,
    };
    const cheapRoute = await resolveByokTaskRoute(baseRoute, "cheap", { userId: user.id });
    const flagRoute = await resolveByokTaskRoute(baseRoute, "flagship", { userId: user.id });
    push({
      group: "byok-tier",
      id: `B-tier-${key.provider}`,
      label: `${key.provider} cheap/flagship routing`,
      status: "pass",
      notes: `cheap=${cheapRoute.modelId} flagship=${flagRoute.modelId} ranked=${health.rankedModels.length}`,
      durationMs: Date.now() - started,
      meta: { cheap: cheapRoute.modelId, flagship: flagRoute.modelId },
    });
  }

  // ── Live enhance — one case per provider (BYOK) + combined system scenarios ─
  const { runResumeEnhancePipeline } = await import(
    "@/lib/job-tracker/enhance/run-resume-enhance-pipeline"
  );

  async function runEnhance(
    group: QaRow["group"],
    id: string,
    label: string,
    userPatch: Partial<SystemQuotaUserRow>,
    pipeline: {
      allowAiUpgrade: boolean;
      forceAiEnabled?: boolean;
      forceSystem?: boolean;
      useCustomerKey?: boolean;
    },
    expect: { engineMode: "ai" | "deterministic"; aiSucceeded: boolean },
  ) {
    const started = Date.now();
    const patched = { ...user, ...userPatch };
    try {
      const result = await runResumeEnhancePipeline({
        userId: user.id,
        user: patched,
        form: ENHANCE_QA_BASE_FORM,
        targetRole: qaCase.targetRole,
        jobDescription: qaCase.jobDescription,
        surface: "job_apply",
        variant: "dashboard",
        traceId: `qa-${id}-${Date.now()}`,
        ...pipeline,
      });
      const durationMs = Date.now() - started;
      if (!result.success) {
        push({ group, id, label, status: "fail", notes: result.error ?? "pipeline failed", durationMs });
        return;
      }
      const modeOk = result.engineMode === expect.engineMode;
      const aiOk = Boolean(result.aiSucceeded) === expect.aiSucceeded;
      const pass = modeOk && aiOk;
      push({
        group,
        id,
        label,
        status: pass ? "pass" : "fail",
        notes: `engineMode=${result.engineMode} aiSucceeded=${result.aiSucceeded} aiMode=${result.aiMode ?? "-"} block=${result.aiBlockCode ?? "-"} warn=${result.warning?.slice(0, 80) ?? "-"}`,
        durationMs,
        meta: {
          aiAttempted: result.aiAttempted,
          aiMode: result.aiMode,
          summarySnippet: (result.form.professionalSummary ?? "").slice(0, 120),
        },
      });
    } catch (err) {
      push({
        group,
        id,
        label,
        status: "fail",
        notes: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
      });
    }
  }

  // BYOK: one enhance per vaulted provider (customer mode, force BYOK)
  for (const key of vaultedAll) {
    if (skipProviders.has(key.provider) || (providerFilter && !providerFilter.has(key.provider))) {
      push({
        group: "byok-pipeline",
        id: `B-live-${key.provider}`,
        label: `BYOK enhance — ${key.provider}`,
        status: "skip",
        notes: skipProviders.has(key.provider)
          ? "skipped — --skip-providers (paid tier)"
          : "skipped — not in --providers filter",
      });
    }
  }

  for (const key of vaulted) {
    if (!isHandshakeProvider(key.provider)) continue;
    await runEnhance(
      "byok-pipeline",
      `B-live-${key.provider}`,
      `BYOK enhance — ${key.provider}`,
      {
        aiSourcePreference: "customer",
        vaultKeyId: key.vaultSecretId,
        activeProvider: key.provider,
      },
      { allowAiUpgrade: true, useCustomerKey: true, forceSystem: false },
      { engineMode: "ai", aiSucceeded: true },
    );
  }

  // System: deduplicated — deterministic once, then system AI variants
  if (skipSystem) {
    for (const id of ["S-live-deterministic", "S-live-system-auto", "S-live-force-system", "S-pool-smoke"]) {
      push({
        group: id === "S-pool-smoke" ? "system-smoke" : "system-pipeline",
        id,
        label: id,
        status: "skip",
        notes: "skipped — --skip-system",
      });
    }
  } else {
  await runEnhance(
    "system-pipeline",
    "S-live-deterministic",
    "Deterministic baseline (AI off)",
    { aiSourcePreference: "disabled" },
    { allowAiUpgrade: true, useCustomerKey: false },
    { engineMode: "deterministic", aiSucceeded: false },
  );

  await runEnhance(
    "system-pipeline",
    "S-live-system-auto",
    "System pool — auto preference, no BYOK override",
    {
      aiSourcePreference: "auto",
      vaultKeyId: null,
      activeProvider: null,
      systemAiEnabled: true,
    },
    { allowAiUpgrade: true, useCustomerKey: false },
    { engineMode: "ai", aiSucceeded: true },
  );

  await runEnhance(
    "system-pipeline",
    "S-live-force-system",
    "forceSystem with vault present",
    { aiSourcePreference: "auto" },
    { allowAiUpgrade: true, forceSystem: true, useCustomerKey: false },
    { engineMode: "ai", aiSucceeded: true },
  );

  // System pool 1-token smoke
  const smokeStarted = Date.now();
  try {
    const { executeWithPoolRetry } = await import("@/src/lib/ai/engine/system-key-pool");
    const { createAiSdkLanguageModel } = await import("@/src/lib/ai/ai-sdk-provider");
    const { generateText } = await import("ai");
    const poolResult = await executeWithPoolRetry(
      async ({ apiKey, modelId, provider, slot }) => {
        const model = createAiSdkLanguageModel(provider, apiKey, modelId);
        const text = await generateText({
          model,
          prompt: "Reply OK",
          maxOutputTokens: 4,
          temperature: 0,
          maxRetries: 0,
        });
        return { text: text.text, modelId, provider, slot };
      },
      { config: aiEngine },
    );
    push({
      group: "system-smoke",
      id: "S-pool-smoke",
      label: "System pool 1-token probe",
      status: "pass",
      notes: `slot=${poolResult.slot} provider=${poolResult.provider} model=${poolResult.modelId} billing=${poolResult.billingMode}`,
      durationMs: Date.now() - smokeStarted,
    });
  } catch (err) {
    push({
      group: "system-smoke",
      id: "S-pool-smoke",
      label: "System pool 1-token probe",
      status: "fail",
      notes: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - smokeStarted,
    });
  }
  }

  writeReport(outPath, {
    email,
    userId: user.id,
    caseId,
    qaCase: { id: caseId, domain: qaCase.domain, targetRole: qaCase.targetRole },
    byokProviders: vaulted.map((k) => k.provider),
    systemKeys,
    config: {
      systemAiFlag: flags.systemAiEnabled,
      enhanceFlag: flags.enhanceWithAiResumeProfile,
      aiEngineEnabled: aiEngine.enabled,
    },
    rows,
  });
}

function writeReport(
  outPath: string,
  payload: Record<string, unknown> & { rows: QaRow[] },
) {
  const passed = payload.rows.filter((r) => r.status === "pass").length;
  const failed = payload.rows.filter((r) => r.status === "fail").length;
  const skipped = payload.rows.filter((r) => r.status === "skip").length;
  const report = {
    capturedAt: new Date().toISOString(),
    summary: { total: payload.rows.length, passed, failed, skipped },
    ...payload,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Summary: ${passed} pass / ${failed} fail / ${skipped} skip`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
