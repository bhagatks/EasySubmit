import { buildCoverLetterSeedPatch } from "@/lib/job-tracker/build-deterministic-cover-letter";
import { extractJobResumeOverrides } from "@/lib/profile/job-resume-overrides";
import {
  updateJobReviewDocuments,
  upsertJobResumeTailor,
} from "@/lib/profile/job-resume-tailor";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { logEnhanceDiag } from "@/src/lib/ai/engine/enhance-diagnostics";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

export type PersistEnhancedResumeInput = {
  userId: string;
  jobId: string;
  enhancedForm: HubRefineryForm;
  enhancedTargetRole: string;
  baseForm: HubRefineryForm;
  baseTargetTitle: string;
  sourceProfileId: string;
  jobTitle: string;
  company: string | null;
  jobDescription: string;
  enhanceTraceId: string;
  traceId: string;
  enhanceMeta?: import("@/lib/job-tracker/enhance/enhance-brief").EnhanceSessionMeta;
};

export type PersistEnhancedResumeResult =
  | { success: true; changedSections: string[] }
  | { success: false; error: string };

/**
 * Shared post-enhance persistence for dashboard and extension.
 * Extracts overrides, persists job_resume_tailor, builds cover letter seed.
 */
export async function persistEnhancedResume(
  input: PersistEnhancedResumeInput,
): Promise<PersistEnhancedResumeResult> {
  const { overrides, changedSections } = extractJobResumeOverrides(
    input.baseForm,
    input.enhancedForm,
    input.baseTargetTitle,
    input.enhancedTargetRole,
  );

  logEnhance("server", "post.overrides", {
    traceId: input.traceId,
    step: ENHANCE_PIPELINE.POST_OVERRIDES,
    userId: input.userId,
    jobId: input.jobId,
    changedSections,
    overrideKeys: Object.keys(overrides),
  });
  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "16",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.POST_OVERRIDES,
    phase: "done",
    level: "low",
    event: "persist.overrides",
    scope: "server",
    userId: input.userId,
    params: {
      jobId: input.jobId,
      changedSections,
      overrideKeyCount: Object.keys(overrides).length,
    },
  });

  await upsertJobResumeTailor({
    jobTrackerEntryId: input.jobId,
    userId: input.userId,
    sourceProfileId: input.sourceProfileId,
    overrides,
    changedSections,
    enhanceTraceId: input.enhanceTraceId,
    enhanceMeta: input.enhanceMeta
      ? ({
          traceId: input.enhanceMeta.traceId,
          engineMode: input.enhanceMeta.engineMode,
          aiAttempted: input.enhanceMeta.aiAttempted,
          aiSucceeded: input.enhanceMeta.aiSucceeded,
          aiBlockCode: input.enhanceMeta.aiBlockCode,
          warning: input.enhanceMeta.warning,
          coverageAfter: input.enhanceMeta.coverageAfter,
          readinessDelta: input.enhanceMeta.readinessDelta,
          enhanceSummary: input.enhanceMeta.enhanceSummary,
          coherenceWarnings: input.enhanceMeta.coherenceWarnings,
          persistedAt: new Date().toISOString(),
        } as import("@/lib/generated/prisma/client").Prisma.InputJsonValue)
      : undefined,
  });

  logEnhance("server", "post.persist.done", {
    traceId: input.traceId,
    step: ENHANCE_PIPELINE.POST_PERSIST,
    userId: input.userId,
    jobId: input.jobId,
    sourceProfileId: input.sourceProfileId,
  });
  logEnhanceDiag({
    traceId: input.traceId,
    designStep: "17",
    track: "persist",
    pipelineStep: ENHANCE_PIPELINE.POST_PERSIST,
    phase: "done",
    level: "high",
    event: "persist.tailor.done",
    scope: "server",
    userId: input.userId,
    params: {
      jobId: input.jobId,
      sourceProfileId: input.sourceProfileId,
      hasEnhanceMeta: Boolean(input.enhanceMeta),
    },
  });

  const coverPatch = buildCoverLetterSeedPatch({
    form: input.enhancedForm,
    targetTitle: input.enhancedTargetRole,
    company: input.company,
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
  });

  if (coverPatch) {
    await updateJobReviewDocuments(input.userId, input.jobId, coverPatch);
    logEnhance("server", "post.cover_seed.done", {
      traceId: input.traceId,
      step: ENHANCE_PIPELINE.POST_COVER_SEED,
      userId: input.userId,
      jobId: input.jobId,
    });
    logEnhanceDiag({
      traceId: input.traceId,
      designStep: "18",
      track: "persist",
      pipelineStep: ENHANCE_PIPELINE.POST_COVER_SEED,
      phase: "done",
      level: "low",
      event: "persist.cover_seed.done",
      scope: "server",
      userId: input.userId,
      params: { jobId: input.jobId },
    });
  }

  return { success: true, changedSections };
}
