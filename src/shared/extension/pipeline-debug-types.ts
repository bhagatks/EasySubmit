/** Temporary Apply-flow debug overlay — shared between server + extension. */

export type PipelineDebugStepStatus =
  | "pending"
  | "active"
  | "done"
  | "skipped"
  | "error";

export type PipelineDebugStepDef = {
  id: string;
  group: string;
  label: string;
  description: string;
};

export type PipelineDebugStep = PipelineDebugStepDef & {
  status: PipelineDebugStepStatus;
  startedAt?: string;
  finishedAt?: string;
  detail?: string;
  meta?: Record<string, unknown>;
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
  },
  {
    id: "capture_save",
    group: "Capture",
    label: "Save job",
    description: "POST /api/extension/jobs/capture → status CAPTURED",
  },
  {
    id: "profile_load",
    group: "Profile",
    label: "Load base profile",
    description: "resolveSourceProfileForJob → HubRefineryForm (base profile, not mutated)",
  },
  {
    id: "pre_validate",
    group: "Pre-process",
    label: "Validate input",
    description: "JD ≥120 chars, sanitize job title",
  },
  {
    id: "pre_onet",
    group: "Pre-process",
    label: "O*NET vocabulary",
    description: "fetchRoleVocabulary — role skills/tools",
  },
  {
    id: "pre_intelligence",
    group: "Pre-process",
    label: "Job intelligence bundle",
    description: "Keyword gap, bullet quality, ATS parse simulation",
  },
  {
    id: "pre_jd_skills",
    group: "Pre-process",
    label: "JD skills vocabulary",
    description: "fetchJdSkillsVocabulary (cached on job row)",
  },
  {
    id: "pre_jd_brain",
    group: "Pre-process",
    label: "JD Brain (deterministic)",
    description: "Segment JD, extract intelligence floor",
  },
  {
    id: "ai_jd_extract",
    group: "AI calls",
    label: "JD extract AI",
    description: "generateObject JD enrichment (cache miss + route allowed)",
  },
  {
    id: "pre_keyword_gap",
    group: "Pre-process",
    label: "Keyword gap (JD-aware)",
    description: "analyzeKeywordGapFromIntelligence",
  },
  {
    id: "pre_directive",
    group: "Pre-process",
    label: "Enhance directive",
    description: "buildResumeEnhanceDirective — mustAddSkills, weave keywords",
  },
  {
    id: "pre_rules",
    group: "Pre-process",
    label: "Summary + skills rules",
    description: "validateSummary, validateSkillsSystem, banned words",
  },
  {
    id: "pre_plan",
    group: "Pre-process",
    label: "Enhance plan + readiness",
    description: "buildEnhancePlan, computeResumeReadiness",
  },
  {
    id: "ai_gates",
    group: "AI gates",
    label: "AI gates G1–G6",
    description: "resolveFeature(enhance) — flags, route, quota",
  },
  {
    id: "baseline",
    group: "Engine",
    label: "Deterministic baseline",
    description: "applyBaselineEnhance — skills merge, weak bullets, JD weave",
  },
  {
    id: "ai_pass1",
    group: "AI calls",
    label: "AI pass 1 — generate",
    description: "generateText full resume rewrite",
  },
  {
    id: "ai_pass2",
    group: "AI calls",
    label: "AI pass 2 — optimize",
    description: "generateText JD-specific polish",
  },
  {
    id: "post_process",
    group: "Persist",
    label: "Post-process + diff",
    description: "postProcess rules, diffChangedSections",
  },
  {
    id: "persist_overrides",
    group: "Persist",
    label: "Persist job overrides",
    description: "job_resume_tailors + cover letter seed",
  },
  {
    id: "status_ready",
    group: "Complete",
    label: "READY_TO_APPLY",
    description: "Pipeline complete — apply assist ready",
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
