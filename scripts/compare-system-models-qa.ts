#!/usr/bin/env npx tsx
/**
 * Live one-job comparison: OpenRouter free vs DeepSeek paid vs deterministic baseline.
 *
 * WARNING: OpenRouter free calls count toward the funded-free daily cap (1000/day at $10+ balance).
 *
 *   npx tsx scripts/compare-system-models-qa.ts --case 002
 *   npx tsx scripts/compare-system-models-qa.ts --case 002 --skip-openrouter
 */
import dotenv from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import {
  ENHANCE_QA_BASE_FORM,
  ENHANCE_QA_CASES,
  type EnhanceQaCaseId,
} from "@/lib/job-tracker/enhance/enhance-qa-fixtures";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { callOpenRouterFreeText } from "@/src/lib/ai/engine/openrouter-free-adapter";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import { generateText } from "ai";

type CliOptions = {
  caseId: EnhanceQaCaseId;
  skipOpenRouter: boolean;
  skipDeepSeek: boolean;
  outDir: string;
};

function parseArgs(argv: string[]): CliOptions {
  const caseArg = argv.find((arg) => arg.startsWith("--case="))?.split("=")[1]
    ?? argv[argv.indexOf("--case") + 1]
    ?? "002";
  const caseId = caseArg as EnhanceQaCaseId;
  if (!ENHANCE_QA_CASES[caseId]) {
    throw new Error(`Unknown case ${caseArg}. Use 001, 002, or 003.`);
  }

  return {
    caseId,
    skipOpenRouter: argv.includes("--skip-openrouter"),
    skipDeepSeek: argv.includes("--skip-deepseek"),
    outDir: join(process.cwd(), "tmp", "compare-system-models-qa"),
  };
}

function readinessForForm(form: typeof ENHANCE_QA_BASE_FORM, targetRole: string, jd: string) {
  return computeResumeReadiness({
    resume: refineryFormToPrimeResume(form),
    targetRole,
    jobDescription: jd,
  }).score;
}

async function runOpenRouterFreeProbe(system: string, prompt: string) {
  const apiKey =
    process.env.EASYSUBMIT_SYSTEM_OPENROUTER_API_KEYS?.split(",")[0]?.trim()
    ?? process.env.EASYSUBMIT_SYSTEM_OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Set EASYSUBMIT_SYSTEM_OPENROUTER_API_KEY(S) for OpenRouter free probe.");
  }

  const startedAt = Date.now();
  const result = await callOpenRouterFreeText({
    apiKey,
    system,
    prompt,
    maxOutputTokens: 512,
    temperature: 0.1,
  });
  return { ...result, durationMs: Date.now() - startedAt };
}

async function runDeepSeekPaidProbe(system: string, prompt: string, modelId: string) {
  const apiKey =
    process.env.EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEYS?.split(",")[0]?.trim()
    ?? process.env.EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Set EASYSUBMIT_SYSTEM_DEEPSEEK_API_KEY(S) for DeepSeek probe.");
  }

  const startedAt = Date.now();
  const model = createAiSdkLanguageModel("deepseek", apiKey, modelId);
  const result = await generateText({
    model,
    system,
    prompt,
    maxOutputTokens: 512,
    temperature: 0.1,
    maxRetries: 0,
  });
  return {
    text: result.text,
    tokensUsed: result.usage?.totalTokens ?? 0,
    modelId,
    durationMs: Date.now() - startedAt,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const qaCase = ENHANCE_QA_CASES[options.caseId];

  console.warn(
    "\n⚠️  Live OpenRouter free calls consume your funded-free daily quota (1000/day at $10+ balance).\n",
  );

  const baselineReadiness = readinessForForm(
    ENHANCE_QA_BASE_FORM,
    qaCase.targetRole,
    qaCase.jobDescription,
  );

  const system = "You are an ATS resume editor. Return concise JSON only.";
  const prompt = `Target role: ${qaCase.targetRole}\nJD:\n${qaCase.jobDescription.slice(0, 4000)}\n\nImprove the professional summary in <=120 words.`;

  const report: Record<string, unknown> = {
    case: qaCase,
    warning: "OpenRouter free calls count toward daily free-tier quota.",
    baseline: {
      readinessScore: baselineReadiness,
      engineMode: "deterministic-input-form",
      note: "Baseline uses the QA fixture form before live model probes.",
    },
  };

  if (!options.skipOpenRouter) {
    try {
      report.openRouterFree = await runOpenRouterFreeProbe(system, prompt);
    } catch (error) {
      report.openRouterFree = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (!options.skipDeepSeek) {
    try {
      report.deepSeekPaid = await runDeepSeekPaidProbe(system, prompt, "deepseek-v4-flash");
    } catch (error) {
      report.deepSeekPaid = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  mkdirSync(options.outDir, { recursive: true });
  const outPath = join(options.outDir, `case-${options.caseId}-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ outPath, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
