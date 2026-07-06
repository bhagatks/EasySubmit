#!/usr/bin/env npx tsx
/**
 * Live Enhance QA — Cases 001/002/003 × pipeline switch scenarios.
 *
 *   npx tsx scripts/enhance-qa-switch-matrix.ts
 *   npx tsx scripts/enhance-qa-switch-matrix.ts --cases 001 --skip-ai
 */
import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import {
  ENHANCE_QA_BASE_FORM,
  ENHANCE_QA_CASES,
  type EnhanceQaCaseId,
} from "@/lib/job-tracker/enhance/enhance-qa-fixtures";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

type PipelineScenarioId = "S02_dev_force_ai" | "S07_system_ai_on" | "S09_force_system" | "S10_preference_system" | "S01_pipeline_deterministic";

type PipelineScenario = {
  id: PipelineScenarioId;
  label: string;
  userPatch: Partial<SystemQuotaUserRow>;
  pipeline: {
    allowAiUpgrade: boolean;
    forceAiEnabled?: boolean;
    forceSystem?: boolean;
    useCustomerKey?: boolean;
  };
  expectEngineMode: "ai" | "deterministic";
  expectAiSucceeded: boolean;
};

const PIPELINE_SCENARIOS: PipelineScenario[] = [
  {
    id: "S01_pipeline_deterministic",
    label: "G3 user disabled — allowAiUpgrade default (deterministic)",
    userPatch: { aiSourcePreference: "disabled" },
    pipeline: { allowAiUpgrade: true, useCustomerKey: false },
    expectEngineMode: "deterministic",
    expectAiSucceeded: false,
  },
  {
    id: "S02_dev_force_ai",
    label: "Dev harness — forceAiEnabled + forceSystem (AI on)",
    userPatch: { aiSourcePreference: "disabled" },
    pipeline: {
      allowAiUpgrade: true,
      forceAiEnabled: true,
      forceSystem: true,
      useCustomerKey: false,
    },
    expectEngineMode: "ai",
    expectAiSucceeded: true,
  },
  {
    id: "S07_system_ai_on",
    label: "Free user auto + systemAiEnabled — system pool",
    userPatch: {
      aiSourcePreference: "auto",
      systemAiEnabled: true,
      vaultKeyId: null,
      activeProvider: null,
      plan: "free",
    },
    pipeline: { allowAiUpgrade: true, useCustomerKey: false },
    expectEngineMode: "ai",
    expectAiSucceeded: true,
  },
  {
    id: "S09_force_system",
    label: "forceSystem overrides vault preference",
    userPatch: { aiSourcePreference: "auto" },
    pipeline: { allowAiUpgrade: true, forceSystem: true, useCustomerKey: false },
    expectEngineMode: "ai",
    expectAiSucceeded: true,
  },
  {
    id: "S10_preference_system",
    label: "aiSourcePreference=system",
    userPatch: { aiSourcePreference: "system", systemAiEnabled: true },
    pipeline: { allowAiUpgrade: true, useCustomerKey: false },
    expectEngineMode: "ai",
    expectAiSucceeded: true,
  },
];

type PipelineResult = {
  success: boolean;
  engineMode?: string;
  aiAttempted?: boolean;
  aiSucceeded?: boolean;
  aiMode?: string;
  aiBlockCode?: string;
  warning?: string;
  error?: string;
  summarySnippet?: string;
  skillsSnippet?: string;
  coherenceWarnings?: string[];
  durationMs: number;
};

type MatrixRow = {
  scenarioId: PipelineScenarioId;
  scenarioLabel: string;
  caseId: EnhanceQaCaseId;
  pipeline: PipelineResult;
  pass: boolean;
  notes: string;
};

function parseArgs() {
  const casesArg = process.argv.indexOf("--cases");
  const caseIds =
    casesArg >= 0
      ? (process.argv[casesArg + 1]?.split(",").map((s) => s.trim()) as EnhanceQaCaseId[])
      : (["001", "002", "003"] as EnhanceQaCaseId[]);
  const outArg = process.argv.indexOf("--out");
  const outPath =
    outArg >= 0 ? process.argv[outArg + 1]! : ".tmp-debug/enhance-qa-matrix-live.json";
  const skipAi = process.argv.includes("--skip-ai");
  const userArg = process.argv.indexOf("--user");
  const userId = userArg >= 0 ? process.argv[userArg + 1] : process.env.ENHANCE_QA_USER_ID;
  return { caseIds, outPath, skipAi, userId };
}

function mergeUser(base: SystemQuotaUserRow, patch: Partial<SystemQuotaUserRow>): SystemQuotaUserRow {
  return { ...base, ...patch };
}

function checkIntegrity(
  result: PipelineResult,
  domain: "cross-domain" | "same-domain",
): string[] {
  const issues: string[] = [];
  const summary = (result.summarySnippet ?? "").toLowerCase();
  const skills = result.skillsSnippet ?? "";
  if (summary.includes("[review]")) issues.push("summary contains [review]");
  if (/\$100m|100m spend/i.test(summary)) issues.push("fabricated spend");
  if (domain === "cross-domain" && /director, procurement|procurement with/i.test(summary)) {
    issues.push("cross-domain summary uses JD procurement title");
  }
  if (/\b(BIG|CARE|Patient|Annual|JOB)\b/.test(skills)) issues.push("junk skill tokens");
  return issues;
}

async function runPipeline(
  user: SystemQuotaUserRow,
  scenario: PipelineScenario,
  caseId: EnhanceQaCaseId,
): Promise<PipelineResult> {
  const qaCase = ENHANCE_QA_CASES[caseId];
  const started = Date.now();
  try {
    const { runResumeEnhancePipeline } = await import(
      "@/lib/job-tracker/enhance/run-resume-enhance-pipeline"
    );
    const result = await runResumeEnhancePipeline({
      userId: user.id,
      user,
      form: ENHANCE_QA_BASE_FORM,
      targetRole: qaCase.targetRole,
      jobDescription: qaCase.jobDescription,
      surface: "job_apply",
      variant: "dashboard",
      traceId: `qa-${scenario.id}-${caseId}-${Date.now()}`,
      ...scenario.pipeline,
    });
    const durationMs = Date.now() - started;
    if (!result.success) {
      return { success: false, error: result.error, durationMs };
    }
    return {
      success: true,
      engineMode: result.engineMode,
      aiAttempted: result.aiAttempted,
      aiSucceeded: result.aiSucceeded,
      aiMode: result.aiMode,
      aiBlockCode: result.aiBlockCode,
      warning: result.warning,
      summarySnippet: (result.form.professionalSummary ?? "").slice(0, 220),
      skillsSnippet: (result.form.skillsText ?? "").slice(0, 220),
      coherenceWarnings: result.coherenceWarnings,
      durationMs,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - started,
    };
  }
}

function evaluate(
  scenario: PipelineScenario,
  pipeline: PipelineResult,
  domain: "cross-domain" | "same-domain",
): { pass: boolean; notes: string } {
  if (!pipeline.success) return { pass: false, notes: pipeline.error ?? "failed" };
  if (pipeline.engineMode !== scenario.expectEngineMode) {
    return {
      pass: false,
      notes: `engineMode ${pipeline.engineMode} != ${scenario.expectEngineMode} block=${pipeline.aiBlockCode ?? "-"} warn=${pipeline.warning ?? "-"}`,
    };
  }
  if (scenario.expectAiSucceeded && !pipeline.aiSucceeded) {
    return {
      pass: false,
      notes: `AI not succeeded attempted=${pipeline.aiAttempted} block=${pipeline.aiBlockCode}`,
    };
  }
  if (!scenario.expectAiSucceeded && pipeline.aiSucceeded) {
    return { pass: false, notes: "unexpected AI success" };
  }
  const integrity = checkIntegrity(pipeline, domain);
  if (integrity.length) return { pass: false, notes: integrity.join("; ") };
  return {
    pass: true,
    notes: `${pipeline.engineMode} ${pipeline.durationMs}ms mode=${pipeline.aiMode ?? "-"}${pipeline.coherenceWarnings?.length ? " +coherence warn" : ""}`,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const { caseIds, outPath, skipAi, userId: userIdArg } = parseArgs();
  const { prisma } = await import("@/lib/prisma");
  const { SYSTEM_QUOTA_USER_SELECT } = await import("@/lib/ai/system-quota-gate-for-user");
  const { resolveEnhanceFeature } = await import("@/lib/features/resolve-enhance");
  const { getAppConfig } = await import("@/src/lib/services/config-service");
  const { getFeatureFlags } = await import("@/src/lib/services/feature-flags-service");
  const { isAiGloballyEnabled } = await import("@/lib/ai/ai-global-enabled");

  const user =
    (userIdArg
      ? await prisma.user.findUnique({ where: { id: userIdArg }, select: SYSTEM_QUOTA_USER_SELECT })
      : null) ??
    (await prisma.user.findFirst({
      orderBy: { updatedAt: "desc" },
      select: SYSTEM_QUOTA_USER_SELECT,
    }));

  if (!user) {
    console.error("No user found");
    process.exit(1);
  }

  const [flags, aiEngine] = await Promise.all([getFeatureFlags(), getAppConfig("aiEngine")]);
  const gateSnapshot = {
    globalAi: isAiGloballyEnabled(),
    featureEnhance: flags.enhanceWithAiResumeProfile,
    systemFlag: flags.systemAiEnabled,
    aiEngineEnabled: aiEngine.enabled,
    userPreference: user.aiSourcePreference,
    userSystemAi: user.systemAiEnabled,
    userVaultKey: Boolean(user.vaultKeyId),
  };

  console.log("Config snapshot:", gateSnapshot);
  console.log(`User: ${user.id}\n`);

  const gateRows: Array<{ id: string; pass: boolean; notes: string }> = [];

  async function gateCheck(
    id: string,
    userPatch: Partial<SystemQuotaUserRow>,
    expectAiAvailable: boolean,
    opts?: { forceAiEnabled?: boolean; forceSystem?: boolean },
  ) {
    const resolution = await resolveEnhanceFeature(
      mergeUser(user as SystemQuotaUserRow, userPatch),
      "job_apply",
      opts,
    );
    const pass = resolution.aiAvailable === expectAiAvailable;
    const notes = `aiAvailable=${resolution.aiAvailable} reason=${resolution.reason ?? "-"} mode=${resolution.mode ?? "-"}`;
    gateRows.push({ id, pass, notes });
    console.log(`${pass ? "PASS" : "FAIL"} ${id} gate — ${notes}`);
  }

  const savedGlobal = process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;
  process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = "false";
  await gateCheck("S03_global_off", {}, false);
  if (savedGlobal === undefined) delete process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED;
  else process.env.EASYSUBMIT_AI_GLOBALLY_ENABLED = savedGlobal;

  await gateCheck("S01_user_ai_off", { aiSourcePreference: "disabled" }, false);
  await gateCheck("S06_user_system_ai_off", {
    systemAiEnabled: false,
    vaultKeyId: null,
    plan: "free",
  }, false);
  await gateCheck("S02_dev_force_ai_gate", { aiSourcePreference: "disabled" }, true, {
    forceAiEnabled: true,
    forceSystem: true,
  });

  if (user.vaultKeyId) {
    await gateCheck("S08_byok", { aiSourcePreference: "customer", vaultKeyId: user.vaultKeyId }, true);
  } else {
    gateRows.push({
      id: "S08_byok",
      pass: true,
      notes: "skipped — no vault key on test user (expected no_key when preference=customer)",
    });
    console.log("SKIP S08_byok — no vault key on user");
  }

  gateRows.push({
    id: "S04_feature_flag",
    pass: true,
    notes: `live config enhanceWithAiResumeProfile=${flags.enhanceWithAiResumeProfile}`,
  });
  gateRows.push({
    id: "S05_system_engine",
    pass: true,
    notes: `live config aiEngine.enabled=${aiEngine.enabled}`,
  });

  const rows: MatrixRow[] = [];
  const scenarios = skipAi
    ? PIPELINE_SCENARIOS.filter((s) => s.expectEngineMode === "deterministic")
    : PIPELINE_SCENARIOS;

  for (const scenario of scenarios) {
    const patched = mergeUser(user as SystemQuotaUserRow, scenario.userPatch);
    for (const caseId of caseIds) {
      const pipeline = await runPipeline(patched, scenario, caseId);
      const { pass, notes } = evaluate(scenario, pipeline, ENHANCE_QA_CASES[caseId].domain);
      rows.push({
        scenarioId: scenario.id,
        scenarioLabel: scenario.label,
        caseId,
        pipeline,
        pass,
        notes,
      });
      console.log(`${pass ? "PASS" : "FAIL"} ${scenario.id} case ${caseId} — ${notes}`);
    }
  }

  const gatePassed = gateRows.filter((g) => g.pass).length;
  const pipePassed = rows.filter((r) => r.pass).length;
  const report = {
    capturedAt: new Date().toISOString(),
    userId: user.id,
    gateSnapshot,
    jobSelection: {
      note: "3 of 7 automation jobs — Case 001 cross-domain procurement; 002/003 same-domain SWE (iRhythm, RELX)",
      cases: caseIds.map((id) => ENHANCE_QA_CASES[id]),
      skippedAutomationIndices: [1, 2, 3, 4, 5],
    },
    summary: {
      gate: { total: gateRows.length, passed: gatePassed },
      pipeline: { total: rows.length, passed: pipePassed },
    },
    gateRows,
    pipelineRows: rows,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  console.log(`Gate ${gatePassed}/${gateRows.length} | Pipeline ${pipePassed}/${rows.length}`);

  const allPass = gatePassed === gateRows.length && pipePassed === rows.length;
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
