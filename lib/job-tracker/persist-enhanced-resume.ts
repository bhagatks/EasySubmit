import { buildCoverLetterSeedPatch } from "@/lib/job-tracker/build-deterministic-cover-letter";
import { extractJobResumeOverrides } from "@/lib/profile/job-resume-overrides";
import {
  updateJobReviewDocuments,
  upsertJobResumeTailor,
} from "@/lib/profile/job-resume-tailor";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { logEnhance } from "@/src/lib/ai/engine/enhance-logger";
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

  await upsertJobResumeTailor({
    jobTrackerEntryId: input.jobId,
    userId: input.userId,
    sourceProfileId: input.sourceProfileId,
    overrides,
    changedSections,
    enhanceTraceId: input.enhanceTraceId,
  });

  logEnhance("server", "post.persist.done", {
    traceId: input.traceId,
    step: ENHANCE_PIPELINE.POST_PERSIST,
    userId: input.userId,
    jobId: input.jobId,
    sourceProfileId: input.sourceProfileId,
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
  }

  return { success: true, changedSections };
}
