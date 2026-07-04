/** Temporary Apply-flow debug overlay — shared between server + extension. */

import type { PipelineDebugArtifact } from "@/src/shared/extension/pipeline-debug-artifacts";

export type PipelineDebugStepStatus =
  | "pending"
  | "active"
  | "done"
  | "skipped"
  | "warning"
  | "error";

export type PipelineDebugStepDef = {
  id: string;
  group: string;
  label: string;
  description: string;
  /** Job tracker kanban stage — capture (1), resume prep (2), ready (3). */
  trackerStage: "capture" | "resume_prep" | "ready";
};

export type PipelineDebugStep = PipelineDebugStepDef & {
  status: PipelineDebugStepStatus;
  startedAt?: string;
  finishedAt?: string;
  detail?: string;
  meta?: Record<string, unknown>;
  /** Rich QA payloads — DB + web overlay only (not PostHog). */
  artifacts?: PipelineDebugArtifact[];
};

export type PipelineDebugProgress = {
  traceId: string;
  startedAt: string;
  updatedAt: string;
  steps: PipelineDebugStep[];
};

export const PIPELINE_DEBUG_METADATA_KEY = "pipelineDebug";

/** Canonical Apply pipeline steps (extension → capture → tailor → persist). */
export const PIPELINE_DEBUG_STEP_DEFS: PipelineDebugStepDef[] = [
  {
    id: "capture_validate",
    group: "Capture",
    label: "Validate scrape fields",
    description: "URL + job description ≥120 chars; title/company resolution",
    trackerStage: "capture",
  },
  {
    id: "capture_save",
    group: "Capture",
    label: "Save job",
    description: "POST /api/extension/jobs/capture → status CAPTURED",
    trackerStage: "capture",
  },
  {
    id: "profile_load",
    group: "Profile",
    label: "Load base profile",
    description: "resolveSourceProfileForJob → HubRefineryForm (base profile, not mutated)",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_validate",
    group: "Pre-process",
    label: "Validate input",
    description: "JD ≥120 chars or job title + company; sanitize job title",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_intelligence",
    group: "Pre-process",
    label: "Job intelligence bundle",
    description: "Keyword gap, bullet quality, ATS parse simulation",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_jd_skills",
    group: "Pre-process",
    label: "JD skills vocabulary",
    description: "fetchJdSkillsVocabulary (cached on job row)",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_jd_brain",
    group: "Pre-process",
    label: "JD Brain (deterministic)",
    description: "Segment JD, extract intelligence floor",
    trackerStage: "resume_prep",
  },
  {
    id: "ai_jd_extract",
    group: "AI calls",
    label: "JD extract AI",
    description: "generateObject JD enrichment (cache miss + route allowed)",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_keyword_gap",
    group: "Pre-process",
    label: "Keyword gap (JD-aware)",
    description: "analyzeKeywordGapFromIntelligence",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_directive",
    group: "Pre-process",
    label: "Enhance directive",
    description: "buildResumeEnhanceDirective — mustAddSkills, weave keywords",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_rules",
    group: "Pre-process",
    label: "Summary + skills rules",
    description: "validateSummary, validateSkillsSystem, banned words",
    trackerStage: "resume_prep",
  },
  {
    id: "pre_plan",
    group: "Pre-process",
    label: "Enhance plan + readiness",
    description: "buildEnhancePlan, computeResumeReadiness",
    trackerStage: "resume_prep",
  },
  {
    id: "ai_gates",
    group: "AI gates",
    label: "AI gates G1–G6",
    description: "resolveFeature(enhance) — flags, route, quota",
    trackerStage: "resume_prep",
  },
  {
    id: "baseline",
    group: "Engine",
    label: "Deterministic baseline",
    description: "applyBaselineEnhance — skills_only when AI runs; full baseline on AI-off or AI-fail",
    trackerStage: "resume_prep",
  },
  {
    id: "ai_pass1",
    group: "AI calls",
    label: "Max-ATS AI pass",
    description: "Single generateText pass via buildAtsOptimizationSpec — regenerate all sections for max score",
    trackerStage: "resume_prep",
  },
  {
    id: "ai_pass2",
    group: "AI calls",
    label: "Pass 2 (retired)",
    description: "Always skipped — max-ATS uses single pass only (kept for step-order compatibility)",
    trackerStage: "resume_prep",
  },
  {
    id: "post_process",
    group: "Persist",
    label: "Post-process + diff",
    description: "postProcess rules, diffChangedSections",
    trackerStage: "resume_prep",
  },
  {
    id: "persist_overrides",
    group: "Persist",
    label: "Persist job overrides",
    description: "job_resume_tailors + cover letter seed",
    trackerStage: "resume_prep",
  },
  {
    id: "status_ready",
    group: "Complete",
    label: "READY_TO_APPLY",
    description: "Pipeline complete — apply assist ready",
    trackerStage: "ready",
  },
];

export function emptyPipelineDebugProgress(traceId: string): PipelineDebugProgress {
  const now = new Date().toISOString();
  return {
    traceId,
    startedAt: now,
    updatedAt: now,
    steps: PIPELINE_DEBUG_STEP_DEFS.map((def) => ({
      ...def,
      status: "pending" as const,
    })),
  };
}

export function parsePipelineDebugProgress(
  value: unknown,
): PipelineDebugProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.traceId !== "string" || !Array.isArray(row.steps)) return null;
  return value as PipelineDebugProgress;
}
