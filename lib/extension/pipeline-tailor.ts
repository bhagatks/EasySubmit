import { enhanceResumeForUserId } from "@/lib/ai/enhance-resume-for-user";
import {
  pipelineDebugAdvance,
  pipelineDebugContext,
  pipelineDebugStep,
} from "@/lib/extension/pipeline-debug-hooks";
import type { SaveJobTrackerInput } from "@/lib/extension/job-service";
import { updateJobTrackerStatus } from "@/lib/extension/job-service";
import {
  formDeltaArtifacts,
  profileLoadArtifacts,
} from "@/lib/extension/pipeline-debug-artifact-builders";
import { resolveJobIdentity } from "@/src/shared/extension/job-identity";
import {
  mergeJobEntryMetadata,
  recordPipelineTailorError,
} from "@/lib/extension/pipeline-metadata";
import type { ApplyPipelinePhase } from "@/lib/extension/pipeline-types";
import { persistEnhancedResume } from "@/lib/job-tracker/persist-enhanced-resume";
import { resolveSourceProfileForJob } from "@/lib/profile/copy-profile-for-job";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { sanitizeString } from "@/lib/profile/sanitize";
import { getPipelineDebugProgress } from "@/lib/extension/pipeline-debug-progress";
import {
  createEnhanceTraceId,
  logEnhance,
  summarizeFormDelta,
  summarizeFormForLog,
} from "@/src/lib/ai/engine/enhance-logger";
import { TAILOR_PIPELINE, ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import {
  hasFullJd,
  resolveEnhanceContextRequirement,
} from "@/lib/job-tracker/enhance/max-ats-helpers";

export type PipelineTailorInput = {
  entryId: string;
  jobTitle: string;
  company?: string | null;
  jobDescription?: string | null;
  sourceProfileId?: string | null;
};

export type PipelineTailorSuccess = {
  success: true;
  jobTrackerEntryId: string;
  sourceProfileId: string;
  phases: ApplyPipelinePhase[];
};

export type PipelineTailorFailure = {
  success: false;
  error: string;
  code:
    | "missing_description"
    | "no_source_profile"
    | "enhance_failed"
    | "persist_failed"
    | "invalid_title";
};

export type PipelineTailorResult = PipelineTailorSuccess | PipelineTailorFailure;

/** Phase B — enhance source profile with JD, persist section overrides on the job row. */
export async function runPipelineTailor(
  userId: string,
  input: PipelineTailorInput,
): Promise<PipelineTailorResult> {
  const existingProgress = await getPipelineDebugProgress(userId, input.entryId);
  const traceId = existingProgress?.traceId ?? createEnhanceTraceId();
  const debug = pipelineDebugContext(userId, input.entryId);

  pipelineDebugAdvance(debug, "profile_load");

  logEnhance("pipeline", "tailor.start", {
    traceId,
    step: TAILOR_PIPELINE.TAILOR_START,
    userId,
    entryId: input.entryId,
    jobTitle: input.jobTitle,
    company: input.company ?? null,
    jobDescriptionChars: input.jobDescription?.trim().length ?? 0,
    sourceProfileId: input.sourceProfileId ?? null,
  });

  const context = resolveEnhanceContextRequirement({
    jobDescription: input.jobDescription,
    targetRole: input.jobTitle,
    companyName: input.company,
  });

  if (!context.ok) {
    logEnhance("pipeline", "tailor.jd_rejected", {
      traceId,
      step: TAILOR_PIPELINE.TAILOR_JD_CHECK,
      reason: "missing_description",
      jobDescriptionChars: input.jobDescription?.trim().length ?? 0,
      hasCompany: Boolean(input.company?.trim()),
    });
    await recordPipelineTailorError(userId, input.entryId, context.error, "missing_description");
    pipelineDebugStep(debug, "pre_validate", {
      status: "error",
      detail: context.error,
      meta: {
        jobDescriptionChars: input.jobDescription?.trim().length ?? 0,
        hasCompany: Boolean(input.company?.trim()),
      },
    });
    return { success: false, error: context.error, code: "missing_description" };
  }

  const tailorJobDescription = context.jobDescription;

  pipelineDebugStep(debug, "pre_validate", {
    status: "done",
    detail: hasFullJd(tailorJobDescription)
      ? `JD ${tailorJobDescription.length} chars`
      : `Role + company (${input.jobTitle} @ ${input.company?.trim()})`,
  });

  logEnhance("pipeline", "tailor.jd_ok", {
    traceId,
    step: TAILOR_PIPELINE.TAILOR_JD_CHECK,
    jobDescriptionChars: tailorJobDescription.length,
    mode: hasFullJd(tailorJobDescription) ? "jd_full" : "role_company",
  });

  const jobTitle = sanitizeString(input.jobTitle, 160);
  if (!jobTitle) {
    const message = "Job title is required to tailor your resume.";
    logEnhance("pipeline", "tailor.fail", {
      traceId,
      step: TAILOR_PIPELINE.TAILOR_FAIL,
      reason: "invalid_title",
    });
    await recordPipelineTailorError(userId, input.entryId, message, "invalid_title");
    pipelineDebugStep(debug, "profile_load", { status: "error", detail: message });
    return { success: false, error: message, code: "invalid_title" };
  }

  const source = await resolveSourceProfileForJob(userId, input.sourceProfileId);
  if (!source) {
    const message = "No resume profile to tailor from";
    logEnhance("pipeline", "tailor.fail", {
      traceId,
      step: TAILOR_PIPELINE.TAILOR_FAIL,
      reason: "no_source_profile",
    });
    await recordPipelineTailorError(userId, input.entryId, message, "no_source_profile");
    pipelineDebugStep(debug, "profile_load", { status: "error", detail: message });
    return { success: false, error: message, code: "no_source_profile" };
  }

  const baseForm = hubRefineryFormFromProfile(source);
  const baseTargetTitle = targetTitleFromProfile(source);

  pipelineDebugStep(debug, "profile_load", {
    status: "done",
    detail:
      [source.firstName, source.lastName].filter(Boolean).join(" ").trim() || source.id,
    meta: {
      sourceProfileId: source.id,
      profileName: [source.firstName, source.lastName].filter(Boolean).join(" ").trim() || null,
      targetTitle: baseTargetTitle,
      experienceCount: baseForm.experience.filter((e) => !e.hidden).length,
      skillsCount: (baseForm.skillsText ?? "").split(",").filter(Boolean).length,
    },
    artifacts: profileLoadArtifacts(baseForm, source),
  });

  logEnhance("pipeline", "tailor.source_profile", {
    traceId,
    step: TAILOR_PIPELINE.TAILOR_SOURCE_PROFILE,
    sourceProfileId: source.id,
    baseTargetTitle,
    form: summarizeFormForLog(baseForm),
  });

  logEnhance("pipeline", "tailor.enhance_dispatch", {
    traceId,
    step: TAILOR_PIPELINE.TAILOR_ENHANCE_DISPATCH,
    enhanceTraceId: traceId,
    targetRole: jobTitle,
  });

  const enhanced = await enhanceResumeForUserId(userId, {
    profileId: source.id,
    jobEntryId: input.entryId,
    form: baseForm,
    targetRole: jobTitle,
    profileTargetTitle: baseTargetTitle,
    jobDescription: tailorJobDescription,
    companyName: input.company ?? null,
    rawResumeText: source.resumeRawText,
    traceId,
    variant: "pipeline",
  });

  if (!enhanced.success) {
    logEnhance("pipeline", "tailor.enhance_failed", {
      traceId,
      step: TAILOR_PIPELINE.TAILOR_FAIL,
      code: enhanced.code,
      error: enhanced.error,
    });
    await recordPipelineTailorError(
      userId,
      input.entryId,
      enhanced.error,
      enhanced.code ?? "enhance_failed",
    );
    pipelineDebugStep(debug, "baseline", {
      status: "error",
      detail: enhanced.error,
      meta: { code: enhanced.code ?? null },
    });
    return {
      success: false,
      error: enhanced.error,
      code: "enhance_failed",
    };
  }

  logEnhance("pipeline", "tailor.enhance_result", {
    traceId,
    step: TAILOR_PIPELINE.TAILOR_ENHANCE_RESULT,
    engineMode: enhanced.engineMode ?? "ai",
    fallbackSummary: enhanced.fallbackSummary ?? null,
    changedSections: enhanced.changedSections,
    targetRole: enhanced.targetRole,
    aiMode: enhanced.aiMode,
    delta: summarizeFormDelta(baseForm, enhanced.form),
  });

  logEnhance("pipeline", "tailor.persist", {
    traceId,
    step: TAILOR_PIPELINE.TAILOR_PERSIST,
    entryId: input.entryId,
    sourceProfileId: source.id,
  });

  pipelineDebugAdvance(debug, "persist_overrides", "post_process", {
    detail: "Enhance complete — persisting overrides",
    meta: {
      engineMode: enhanced.engineMode,
      aiMode: enhanced.aiMode,
      aiAttempted: enhanced.aiAttempted,
      aiSucceeded: enhanced.aiSucceeded,
      changedSections: enhanced.changedSections,
    },
  });

  const persist = await persistEnhancedResume({
    userId,
    jobId: input.entryId,
    enhancedForm: enhanced.form,
    enhancedTargetRole: enhanced.targetRole,
    baseForm,
    baseTargetTitle,
    sourceProfileId: source.id,
    jobTitle,
    company: input.company ?? null,
    jobDescription: tailorJobDescription,
    enhanceTraceId: traceId,
    traceId,
    enhanceMeta: enhanced.sessionMeta,
  });

  if (!persist.success) {
    const message = "Failed to save tailored resume for this job";
    logEnhance("pipeline", "tailor.persist_failed", {
      traceId,
      step: TAILOR_PIPELINE.TAILOR_FAIL,
      reason: "persist_failed",
      error: persist.error,
    });
    await recordPipelineTailorError(userId, input.entryId, message, "persist_failed");
    pipelineDebugStep(debug, "persist_overrides", { status: "error", detail: message });
    return { success: false, error: message, code: "persist_failed" };
  }

  const { changedSections } = persist;

  await updateJobTrackerStatus(userId, input.entryId, "RESUME_READY");
  await mergeJobEntryMetadata(userId, input.entryId, {
    pipelineError: null,
    pipelineErrorCode: null,
    pipelineAiWarning:
      enhanced.aiAttempted && !enhanced.aiSucceeded && enhanced.warning?.trim()
        ? enhanced.warning.trim()
        : enhanced.aiSucceeded
          ? null
          : null,
    pipelinePhases: ["capture", "tailor"],
    lastTailoredAt: new Date().toISOString(),
    sourceProfileId: source.id,
  });

  pipelineDebugStep(debug, "persist_overrides", {
    status: "done",
    detail: `Changed: ${changedSections.join(", ") || "none"}`,
    meta: { changedSections },
    artifacts: formDeltaArtifacts("Tailored form delta", baseForm, enhanced.form),
  });

  logEnhance("pipeline", "post.pipeline_state.done", {
    traceId,
    step: ENHANCE_PIPELINE.POST_PIPELINE_STATE,
    entryId: input.entryId,
    status: "RESUME_READY",
    phases: ["capture", "tailor"],
    sourceProfileId: source.id,
  });

  logEnhance("pipeline", "tailor.success", {
    traceId,
    step: TAILOR_PIPELINE.TAILOR_SUCCESS,
    entryId: input.entryId,
    sourceProfileId: source.id,
    changedSections,
  });

  return {
    success: true,
    jobTrackerEntryId: input.entryId,
    sourceProfileId: source.id,
    phases: ["capture", "tailor"],
  };
}

export function buildTailorInputFromSave(
  entryId: string,
  input: SaveJobTrackerInput,
): PipelineTailorInput {
  const identity = resolveJobIdentity({
    url: input.url,
    title: input.title,
    company: input.company,
    description: input.description ?? "",
  });

  return {
    entryId,
    jobTitle: input.title?.trim() || identity.title,
    company: input.company?.trim() || identity.company,
    jobDescription: input.description,
    sourceProfileId: input.sourceProfileId,
  };
}
