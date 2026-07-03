import { enhanceResumeForUserId } from "@/lib/ai/enhance-resume-for-user";
import { enhanceCoverLetterForUserId } from "@/lib/ai/enhance-cover-letter-for-user";
import { detectPlatform, resolvePlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { generateResumeLatex } from "@/lib/job-tracker/latex/review-latex";
import { buildCoverLetterDocumentPatch } from "@/lib/job-tracker/persist-cover-letter";
import { persistEnhancedResume } from "@/lib/job-tracker/persist-enhanced-resume";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import {
  getMergedResumeForJob,
  getJobResumeTailorForEntry,
  updateJobReviewDocuments,
} from "@/lib/profile/job-resume-tailor";
import {
  hubRefineryFormFromProfile,
  targetTitleFromProfile,
} from "@/lib/profile/studio-form-db";
import { findProfileForUser } from "@/lib/profile/resume-profile-core";
import { prisma } from "@/lib/prisma";
import { createEnhanceTraceId, logEnhance } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

export type EnhanceResumeActionResult =
  | {
      success: true;
      engineMode?: "ai" | "deterministic";
      fallbackSummary?: string;
      aiMode?: "customer" | "system";
      atsDelta?: { before: number; after: number };
      readinessDelta?: { before: number; after: number };
      enhanceSummary?: string;
      warning?: string;
      aiAttempted?: boolean;
      aiSucceeded?: boolean;
      aiBlockCode?: string;
      coverageAfter?: import("@/lib/job-tracker/enhance/enhance-brief").JdCoverageReport;
      coherenceWarnings?: string[];
    }
  | { success: false; error: string; code?: string; byokAvailable?: boolean };

export type EnhanceCoverActionResult =
  | {
      success: true;
      engineMode?: "ai" | "deterministic";
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
      canonicalUrl: true,
      platform: true,
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

  const traceId = createEnhanceTraceId();
  const atsPlatform = detectPlatform(job.canonicalUrl, job.platform);
  const atsStrategy = resolvePlatformStrategy(atsPlatform);

  const beforePrime = refineryFormToPrimeResume(merged.form);
  const beforeScore = computeResumeReadiness(
    beforePrime,
    merged.targetTitle,
    description,
    undefined,
    atsPlatform,
  ).total;

  const source = await findProfileForUser(userId, merged.sourceProfileId);
  if (!source) {
    return { success: false, error: "Source resume profile not found", code: "no_source_profile" };
  }
  const baseTargetTitle = targetTitleFromProfile(source);

  logEnhance("server", "post.ats_before", {
    traceId,
    step: ENHANCE_PIPELINE.POST_ATS_BEFORE,
    userId,
    jobId,
    atsScoreBefore: beforeScore,
    atsPlatform,
    atsStrategy,
  });
  const enhanced = await enhanceResumeForUserId(userId, {
    profileId: merged.sourceProfileId,
    jobEntryId: jobId,
    form: merged.form,
    targetRole: job.title?.trim() || merged.targetTitle,
    profileTargetTitle: baseTargetTitle,
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

  const baseForm = hubRefineryFormFromProfile(source);

  const persist = await persistEnhancedResume({
    userId,
    jobId,
    enhancedForm: enhanced.form,
    enhancedTargetRole: enhanced.targetRole,
    baseForm,
    baseTargetTitle,
    sourceProfileId: merged.sourceProfileId,
    jobTitle: job.title,
    company: job.company,
    jobDescription: description,
    enhanceTraceId: traceId,
    traceId,
    enhanceMeta: enhanced.sessionMeta,
  });

  if (!persist.success) {
    return { success: false, error: persist.error, code: "persist_failed" };
  }

  const { changedSections } = persist;
  const resumeLatex = generateResumeLatex(enhanced.form, enhanced.targetRole);
  await updateJobReviewDocuments(userId, jobId, { resumeLatex });

  const afterPrime = refineryFormToPrimeResume(enhanced.form);
  let afterScore = computeResumeReadiness(
    afterPrime,
    enhanced.targetRole,
    description,
    undefined,
    atsPlatform,
  ).total;

  const isCrossDomain = enhanced.coherenceWarnings?.some((w) =>
    w.includes("may not match your experience"),
  );
  if (isCrossDomain) {
    afterScore = Math.min(afterScore, beforeScore + 5);
  }

  logEnhance("server", "post.ats_after", {
    traceId,
    step: ENHANCE_PIPELINE.POST_ATS_AFTER,
    userId,
    jobId,
    atsScoreBefore: beforeScore,
    atsScoreAfter: afterScore,
    atsDelta: afterScore - beforeScore,
    atsPlatform,
    atsStrategy,
  });

  return {
    success: true,
    engineMode: enhanced.engineMode,
    fallbackSummary: enhanced.fallbackSummary ?? enhanced.enhanceSummary,
    aiMode: enhanced.aiMode,
    atsDelta: { before: beforeScore, after: afterScore },
    readinessDelta: enhanced.readinessDelta ?? { before: beforeScore, after: afterScore },
    enhanceSummary: enhanced.enhanceSummary ?? enhanced.fallbackSummary,
    warning: enhanced.warning,
    aiAttempted: enhanced.aiAttempted,
    aiSucceeded: enhanced.aiSucceeded,
    aiBlockCode: enhanced.aiBlockCode,
    coverageAfter: enhanced.coverageAfter,
    coherenceWarnings: enhanced.coherenceWarnings,
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
    engineMode: enhanced.engineMode,
    fallbackSummary: enhanced.fallbackSummary,
    aiMode: enhanced.aiMode,
  };
}
