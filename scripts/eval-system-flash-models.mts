#!/usr/bin/env npx tsx
/**
 * Benchmark system flash models for JD extract + resume bullet enhance.
 *
 * Usage:
 *   npx tsx scripts/eval-system-flash-models.mts
 *   npx tsx scripts/eval-system-flash-models.mts --only deepseek,gemini
 *
 * Env (set at least one provider you want to test):
 *   DEEPSEEK_API_KEY          — DeepSeek Flash (deepseek-chat)
 *   OPENROUTER_API_KEY        — GLM Flash via OpenRouter (z-ai/glm-4-flash)
 *   GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY — Gemini Flash baseline
 *
 * Does not touch the DB or system pool — direct BYOK-style calls for comparison.
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

import { generateText } from "ai";
import type { PrimeResumeData } from "@/components/onboarding/PrimeResume";
import { analyzeKeywordGap } from "@/lib/job-tracker/ats/keyword-gap";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import {
  buildJDExtractionPrompt,
  mergeAIIntoIntelligence,
} from "@/lib/job-tracker/jd/jd-ai-extractor";
import { jdAiExtractSchema } from "@/lib/job-tracker/jd/jd-ai-extract-schema";
import { makeEmptyIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { createAiSdkLanguageModel } from "@/src/lib/ai/ai-sdk-provider";
import { generateStructuredWithFallback } from "@/src/lib/ai/engine/structured-extract";
import type { AiProvider } from "@/src/lib/config/app.config";
import {
  SYSTEM_JD_EXTRACT_MODEL_DEFAULTS,
  SYSTEM_RESUME_MODEL_DEFAULTS,
  type SystemPoolProvider,
} from "@/src/lib/ai/engine/system-model-defaults";

type EvalTarget = {
  label: string;
  provider: AiProvider;
  resumeModelId: string;
  jdModelId: string;
  apiKey: string;
};

const JD_FIXTURE = {
  targetRole: "Staff Platform Engineer",
  segments: {
    requirements: `
- 8+ years backend experience
- Strong Go, TypeScript, and PostgreSQL
- Kubernetes and AWS required
`.trim(),
    responsibilities: `
- Design services in Go and TypeScript
- Operate PostgreSQL and Kubernetes in production
- Partner with teams on AWS infrastructure
`.trim(),
    preferred: "",
    context: "Nimbus Systems platform team",
    source: "heuristic" as const,
    wordCount: { requirements: 20, responsibilities: 25, preferred: 0 },
  },
};

const RESUME_FIXTURE: PrimeResumeData = {
  fullName: "Morgan Chen",
  email: "morgan.chen@example.com",
  phone: "(415) 555-0199",
  location: "Austin, TX",
  linkedIn: "",
  summary: "Platform engineer with ten years building reliable backend systems.",
  skills: ["TypeScript", "Go", "PostgreSQL", "Kubernetes", "AWS", "Docker"],
  experience: [
    {
      id: "1",
      title: "Staff Platform Engineer",
      company: "Horizon Labs",
      location: "Austin, TX",
      startDate: "Mar 2021",
      endDate: "Present",
      bullets: [
        "Led migration to Kubernetes on AWS.",
        "Improved PostgreSQL query performance across core services.",
      ],
    },
  ],
  education: [
    {
      id: "1",
      school: "State University",
      degree: "B.S. Computer Science",
      startDate: "2013",
      endDate: "2017",
    },
  ],
  certifications: [],
  projects: [],
  languages: [],
  customSections: [],
};

const JD_SYSTEM =
  "You are an expert technical recruiter and resume strategist. " +
  "Extract structured job intelligence from the provided sections. " +
  "Never invent facts not present in the text.";

const ENHANCE_SYSTEM =
  "You are an ATS resume expert. Rewrite experience bullets to align with the job. " +
  "Return plain text only — three improved bullets, one per line, no numbering.";

function resolveApiKey(provider: SystemPoolProvider): string | null {
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_API_KEY?.trim() || null;
  }
  if (provider === "openrouter") {
    return process.env.OPENROUTER_API_KEY?.trim() || null;
  }
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    null
  );
}

function buildTargets(only?: Set<SystemPoolProvider>): EvalTarget[] {
  const providers: SystemPoolProvider[] = ["deepseek", "openrouter", "gemini"];
  const targets: EvalTarget[] = [];

  for (const provider of providers) {
    if (only && !only.has(provider)) continue;
    const apiKey = resolveApiKey(provider);
    if (!apiKey) continue;
    targets.push({
      label: provider,
      provider,
      resumeModelId: SYSTEM_RESUME_MODEL_DEFAULTS[provider],
      jdModelId: SYSTEM_JD_EXTRACT_MODEL_DEFAULTS[provider],
      apiKey,
    });
  }

  return targets;
}

function scoreJdExtract(payload: {
  mustHaveSkills: string[];
  summaryTheme: string;
}): { skillHits: number; skillTotal: number; hasSummary: boolean } {
  const expected = ["go", "typescript", "postgresql", "kubernetes", "aws"];
  const found = new Set(payload.mustHaveSkills.map((s) => s.toLowerCase()));
  const skillHits = expected.filter((skill) =>
    [...found].some((s) => s.includes(skill)),
  ).length;
  return {
    skillHits,
    skillTotal: expected.length,
    hasSummary: payload.summaryTheme.trim().length > 10,
  };
}

async function evalTarget(target: EvalTarget) {
  const jdPrompt = buildJDExtractionPrompt(JD_FIXTURE.segments, JD_FIXTURE.targetRole);
  const jdStarted = Date.now();

  let jdOk = false;
  let jdMode: "object" | "text_fallback" | "error" = "error";
  let jdTokens = 0;
  let jdScore = { skillHits: 0, skillTotal: 5, hasSummary: false };
  let jdError: string | null = null;

  try {
    const model = createAiSdkLanguageModel(target.provider, target.apiKey, target.jdModelId);
    const jdResult = await generateStructuredWithFallback({
      model,
      provider: target.provider,
      system: JD_SYSTEM,
      prompt: jdPrompt,
      schema: jdAiExtractSchema,
    });
    jdOk = true;
    jdMode = jdResult.mode;
    jdTokens = jdResult.tokensUsed;
    jdScore = scoreJdExtract(jdResult.object);
  } catch (err) {
    jdError = err instanceof Error ? err.message : String(err);
  }

  const jdLatencyMs = Date.now() - jdStarted;

  const baselineGap = analyzeKeywordGap(
    RESUME_FIXTURE,
    JD_FIXTURE.segments.requirements + "\n" + JD_FIXTURE.segments.responsibilities,
  );
  const baselineReadiness = computeResumeReadiness(
    RESUME_FIXTURE,
    JD_FIXTURE.targetRole,
    JD_FIXTURE.segments.requirements + "\n" + JD_FIXTURE.segments.responsibilities,
  );

  const enhancePrompt = [
    `Target role: ${JD_FIXTURE.targetRole}`,
    "",
    "JOB REQUIREMENTS:",
    JD_FIXTURE.segments.requirements,
    "",
    "CURRENT BULLETS:",
    RESUME_FIXTURE.experience[0]?.bullets.join("\n") ?? "",
    "",
    "Rewrite 3 stronger bullets with metrics and JD keywords where truthful.",
  ].join("\n");

  const enhanceStarted = Date.now();
  let enhanceOk = false;
  let enhanceTokens = 0;
  let enhanceText = "";
  let enhanceError: string | null = null;

  try {
    const model = createAiSdkLanguageModel(target.provider, target.apiKey, target.resumeModelId);
    const result = await generateText({
      model,
      system: ENHANCE_SYSTEM,
      prompt: enhancePrompt,
      temperature: 0.1,
      maxOutputTokens: 1024,
    });
    enhanceOk = true;
    enhanceTokens = result.usage?.totalTokens ?? 0;
    enhanceText = result.text.trim();
  } catch (err) {
    enhanceError = err instanceof Error ? err.message : String(err);
  }

  const enhanceLatencyMs = Date.now() - enhanceStarted;

  const intel = jdOk
    ? mergeAIIntoIntelligence(makeEmptyIntelligence(), {
        mustHaveSkills: jdScore.skillHits > 0 ? ["Go", "TypeScript"] : [],
      })
    : makeEmptyIntelligence();

  void intel;

  const enhancedBullets = enhanceText
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const enhancedResume: PrimeResumeData = {
    ...RESUME_FIXTURE,
    experience: [
      {
        ...RESUME_FIXTURE.experience[0]!,
        bullets: enhancedBullets.length ? enhancedBullets : RESUME_FIXTURE.experience[0]!.bullets,
      },
    ],
  };

  const afterGap = analyzeKeywordGap(
    enhancedResume,
    JD_FIXTURE.segments.requirements + "\n" + JD_FIXTURE.segments.responsibilities,
  );
  const afterReadiness = computeResumeReadiness(
    enhancedResume,
    JD_FIXTURE.targetRole,
    JD_FIXTURE.segments.requirements + "\n" + JD_FIXTURE.segments.responsibilities,
  );

  return {
    label: target.label,
    provider: target.provider,
    resumeModelId: target.resumeModelId,
    jdModelId: target.jdModelId,
    jd: {
      ok: jdOk,
      mode: jdMode,
      latencyMs: jdLatencyMs,
      tokens: jdTokens,
      skillHits: jdScore.skillHits,
      skillTotal: jdScore.skillTotal,
      hasSummary: jdScore.hasSummary,
      error: jdError,
    },
    enhance: {
      ok: enhanceOk,
      latencyMs: enhanceLatencyMs,
      tokens: enhanceTokens,
      error: enhanceError,
      preview: enhanceText.slice(0, 240),
    },
    scores: {
      keywordCoverageBefore: baselineGap.coveragePercent,
      keywordCoverageAfter: afterGap.coveragePercent,
      readinessBefore: baselineReadiness.score,
      readinessAfter: afterReadiness.score,
    },
  };
}

function parseOnlyArg(): Set<SystemPoolProvider> | undefined {
  const flag = process.argv.find((arg) => arg.startsWith("--only="));
  if (!flag) return undefined;
  const raw = flag.slice("--only=".length);
  const set = new Set<SystemPoolProvider>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed === "deepseek" || trimmed === "openrouter" || trimmed === "gemini") {
      set.add(trimmed);
    }
  }
  return set.size ? set : undefined;
}

async function main() {
  const only = parseOnlyArg();
  const targets = buildTargets(only);

  if (!targets.length) {
    console.error(
      "No API keys found. Set DEEPSEEK_API_KEY, OPENROUTER_API_KEY, and/or GOOGLE_GENERATIVE_AI_API_KEY.",
    );
    process.exit(1);
  }

  console.log(`Evaluating ${targets.length} model target(s)…\n`);

  const results = [];
  for (const target of targets) {
    console.log(`→ ${target.label} (resume: ${target.resumeModelId}, jd: ${target.jdModelId})`);
    const result = await evalTarget(target);
    results.push(result);
    console.log(JSON.stringify(result, null, 2));
    console.log("");
  }

  console.log("── Summary ──");
  for (const r of results) {
    const delta = r.scores.readinessAfter - r.scores.readinessBefore;
    console.log(
      [
        r.label.padEnd(12),
        `JD ${r.jd.ok ? "ok" : "FAIL"} ${r.jd.latencyMs}ms`,
        `skills ${r.jd.skillHits}/${r.jd.skillTotal}`,
        `enhance ${r.enhance.ok ? "ok" : "FAIL"} ${r.enhance.latencyMs}ms`,
        `readiness ${r.scores.readinessBefore}→${r.scores.readinessAfter} (${delta >= 0 ? "+" : ""}${delta})`,
        `coverage ${r.scores.keywordCoverageBefore}%→${r.scores.keywordCoverageAfter}%`,
      ].join(" | "),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
