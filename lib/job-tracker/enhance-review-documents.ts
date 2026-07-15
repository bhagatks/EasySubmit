import { enhanceResumeForUserId } from "@/lib/ai/enhance-resume-for-user";
import { enhanceCoverLetterForUserId } from "@/lib/ai/enhance-cover-letter-for-user";
import { detectPlatform, resolvePlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { generateResumeLatex } from "@/lib/job-tracker/latex/review-latex";
import { buildCoverLetterDocumentPatch } from "@/lib/job-tracker/persist-cover-letter";
import { persistEnhancedResume } from "@/lib/job-tracker/persist-enhanced-resume";
import { mergeJobEntryMetadata } from "@/lib/extension/pipeline-metadata";
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
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import { resolveEnhanceContextRequirement } from "@/lib/job-tracker/enhance/max-ats-helpers";
import { resolveEnhanceFeedbackTier } from "@/lib/job-tracker/enhance/enhance-feedback-tier";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import { createEnhanceTraceId, logEnhance } from "@/src/lib/ai/engine/enhance-logger";

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
      action?: import("@/lib/ai/call-kernel/types").AiEnhanceOutcomeAction;
      actionHref?: string | null;
      aiAttempted?: boolean;
      aiSucceeded?: boolean;
      aiBlockCode?: string;
      coverageAfter?: import("@/lib/job-tracker/enhance/enhance-brief").JdCoverageReport;
      coherenceWarnings?: string[];
      suggestedTargetRoles?: string[];
      feedbackTier?: import("@/lib/job-tracker/enhance/enhance-feedback-tier").EnhanceFeedbackTier;
      isCrossDomain?: boolean;
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
      jdIntelligence: true,
      resumeTailor: { select: { id: true, coverLetter: true } },
    },
  });
}

function readJdIntelligence(raw: unknown): JDIntelligence | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as JDIntelligence;
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
  const targetRole = job.title?.trim() || merged.targetTitle;
  const context = resolveEnhanceContextRequirement({
    jobDescription: description,
    targetRole,
    companyName: job.company,
  });
  if (!context.ok) {
    return {
      success: false,
      error: context.error,
      code: "missing_description",
    };
  }
  const enhanceJobDescription = context.jobDescription;

  const traceId = createEnhanceTraceId();
  const atsPlatform = detectPlatform(job.canonicalUrl, job.platform);
  const atsStrategy = resolvePlatformStrategy(atsPlatform);
  const jdIntelligence = readJdIntelligence(job.jdIntelligence);

  const beforePrime = refineryFormToPrimeResume(merged.form);
  const beforeScore = computeResumeReadiness(
    beforePrime,
    merged.targetTitle,
    enhanceJobDescription,
    jdIntelligence,
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
    targetRole,
    profileTargetTitle: baseTargetTitle,
    jobDescription: enhanceJobDescription,
    companyName: job.company,
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
    jobDescription: enhanceJobDescription,
    enhanceTraceId: traceId,
    traceId,
    enhanceMeta: enhanced.sessionMeta,
  });

  if (!persist.success) {
    return { success: false, error: persist.error, code: "persist_failed" };
  }

  await mergeJobEntryMetadata(userId, jobId, {
    pipelineAiWarning:
      enhanced.aiAttempted && !enhanced.aiSucceeded && enhanced.warning?.trim()
        ? enhanced.warning.trim()
        : enhanced.aiSucceeded
          ? null
          : undefined,
  });

  const { changedSections } = persist;
  const resumeLatex = generateResumeLatex(enhanced.form, enhanced.targetRole);
  await updateJobReviewDocuments(userId, jobId, { resumeLatex });

  const afterPrime = refineryFormToPrimeResume(enhanced.form);
  const afterScore = computeResumeReadiness(
    afterPrime,
    enhanced.targetRole,
    enhanceJobDescription,
    jdIntelligence,
    atsPlatform,
  ).total;

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
    action: enhanced.action,
    actionHref: enhanced.actionHref,
    aiAttempted: enhanced.aiAttempted,
    aiSucceeded: enhanced.aiSucceeded,
    aiBlockCode: enhanced.aiBlockCode,
    coverageAfter: enhanced.coverageAfter,
    coherenceWarnings: enhanced.coherenceWarnings,
    suggestedTargetRoles: enhanced.sessionMeta?.suggestedTargetRoles,
    isCrossDomain: enhanced.sessionMeta?.isCrossDomain,
    feedbackTier: resolveEnhanceFeedbackTier({
      engineMode: enhanced.engineMode,
      coherenceWarnings: enhanced.coherenceWarnings,
      isCrossDomain: enhanced.sessionMeta?.isCrossDomain,
    }),
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
