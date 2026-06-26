import { enhanceResumeForUserId } from "@/lib/ai/enhance-resume-for-user";
import { enhanceCoverLetterForUserId } from "@/lib/ai/enhance-cover-letter-for-user";
import { buildCoverLetterSeedPatch } from "@/lib/job-tracker/build-deterministic-cover-letter";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { generateResumeLatex } from "@/lib/job-tracker/latex/review-latex";
import { buildCoverLetterDocumentPatch } from "@/lib/job-tracker/persist-cover-letter";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import { extractJobResumeOverrides } from "@/lib/profile/job-resume-overrides";
import {
  getMergedResumeForJob,
  getJobResumeTailorForEntry,
  updateJobReviewDocuments,
  upsertJobResumeTailor,
} from "@/lib/profile/job-resume-tailor";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { findProfileForUser } from "@/lib/profile/resume-profile-core";
import { prisma } from "@/lib/prisma";
import { createEnhanceTraceId } from "@/src/lib/ai/engine/enhance-logger";

export type EnhanceResumeActionResult =
  | {
      success: true;
      fallbackUsed?: boolean;
      fallbackSummary?: string;
      aiMode?: "customer" | "system";
      atsDelta?: { before: number; after: number };
      enhanceSummary?: string;
    }
  | { success: false; error: string; code?: string; byokAvailable?: boolean };

export type EnhanceCoverActionResult =
  | {
      success: true;
      fallbackUsed?: boolean;
      fallbackSummary?: string;
      aiMode?: "customer" | "system";
    }
  | { success: false; error: string; code?: string; byokAvailable?: boolean };

async function loadJobRow(userId: string, jobId: string) {
  return prisma.jobTrackerEntry.findFirst({
    where: { id: jobId, userId },
    select: {
      id: true,
      title: true,
      company: true,
      description: true,
      resumeTailor: { select: { id: true, coverLetter: true } },
    },
  });
}

export async function enhanceJobResumeForUser(
  userId: string,
  jobId: string,
  options?: { useCustomerKey?: boolean },
): Promise<EnhanceResumeActionResult> {
  const job = await loadJobRow(userId, jobId);
  if (!job) return { success: false, error: "Job not found", code: "not_found" };

  const merged = await getMergedResumeForJob(userId, jobId);
  if (!merged.success) return { success: false, error: merged.error, code: "not_ready" };

  const description = job.description?.trim() ?? "";
  if (description.length < 120) {
    return {
      success: false,
      error: "Job description is too short to enhance your resume. Re-capture the posting first.",
      code: "missing_description",
    };
  }

  const beforePrime = refineryFormToPrimeResume(merged.form);
  const beforeScore = computeResumeReadiness(beforePrime, merged.targetTitle, description).total;

  const traceId = createEnhanceTraceId();
  const enhanced = await enhanceResumeForUserId(userId, {
    profileId: merged.sourceProfileId,
    jobEntryId: jobId,
    form: merged.form,
    targetRole: merged.targetTitle,
    jobDescription: description,
    rawResumeText: merged.rawResumeText,
    traceId,
    variant: "dashboard",
    useCustomerKey: options?.useCustomerKey,
  });

  if (!enhanced.success) {
    return {
      success: false,
      error: enhanced.error,
      code: enhanced.code,
      byokAvailable: enhanced.byokAvailable,
    };
  }

  const source = await findProfileForUser(userId, merged.sourceProfileId);
  if (!source) {
    return { success: false, error: "Source resume profile not found", code: "no_source_profile" };
  }

  const baseForm = hubRefineryFormFromProfile(source);
  const baseTargetTitle = targetTitleFromProfile(source);
  const { overrides, changedSections } = extractJobResumeOverrides(
    baseForm,
    enhanced.form,
    baseTargetTitle,
    enhanced.targetRole,
  );

  await upsertJobResumeTailor({
    jobTrackerEntryId: jobId,
    userId,
    sourceProfileId: merged.sourceProfileId,
    overrides,
    changedSections,
    enhanceTraceId: traceId,
  });

  const resumeLatex = generateResumeLatex(enhanced.form, enhanced.targetRole);
  await updateJobReviewDocuments(userId, jobId, { resumeLatex });

  const coverPatch = buildCoverLetterSeedPatch({
    form: enhanced.form,
    targetTitle: enhanced.targetRole,
    company: job.company,
    jobTitle: job.title,
    jobDescription: description,
  });
  if (coverPatch) {
    await updateJobReviewDocuments(userId, jobId, coverPatch);
  }

  const afterPrime = refineryFormToPrimeResume(enhanced.form);
  const afterScore = computeResumeReadiness(afterPrime, enhanced.targetRole, description).total;

  return {
    success: true,
    fallbackUsed: enhanced.fallbackUsed,
    fallbackSummary: enhanced.fallbackSummary,
    aiMode: enhanced.aiMode,
    atsDelta: { before: beforeScore, after: afterScore },
    enhanceSummary: enhanced.fallbackUsed
      ? enhanced.fallbackSummary
      : changedSections.length > 0
        ? `Updated ${changedSections.length} section${changedSections.length > 1 ? "s" : ""}: ${changedSections.join(", ")}.`
        : undefined,
  };
}

export async function enhanceJobCoverLetterForUser(
  userId: string,
  jobId: string,
  options?: { useCustomerKey?: boolean },
): Promise<EnhanceCoverActionResult> {
  const job = await loadJobRow(userId, jobId);
  if (!job) return { success: false, error: "Job not found", code: "not_found" };

  const merged = await getMergedResumeForJob(userId, jobId);
  const form = merged.success ? merged.form : null;
  const targetTitle = merged.success ? merged.targetTitle : job.title;

  if (!form) {
    return {
      success: false,
      error: "Save and tailor a resume for this job before generating a cover letter.",
      code: "not_ready",
    };
  }

  const tailor = await getJobResumeTailorForEntry(userId, jobId);
  const traceId = createEnhanceTraceId();

  const enhanced = await enhanceCoverLetterForUserId(userId, {
    form,
    targetTitle,
    company: job.company,
    jobTitle: job.title,
    jobDescription: job.description,
    existing: tailor?.coverLetter,
    traceId,
    variant: "dashboard",
    useCustomerKey: options?.useCustomerKey,
  });

  if (!enhanced.success) {
    return {
      success: false,
      error: enhanced.error,
      code: enhanced.code,
      byokAvailable: enhanced.byokAvailable,
    };
  }

  const patch = buildCoverLetterDocumentPatch({
    form,
    company: job.company,
    jobTitle: job.title,
    body: enhanced.body,
  });

  const updated = await updateJobReviewDocuments(userId, jobId, patch);
  if (!updated.success) return updated;

  return {
    success: true,
    ...(enhanced.fallbackUsed
      ? {
          fallbackUsed: true,
          fallbackSummary: enhanced.fallbackSummary,
          aiMode: enhanced.aiMode,
        }
      : {}),
  };
}
