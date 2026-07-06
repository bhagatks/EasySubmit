/**
 * Minimal brief for happy-path resume AI — skills merge + job directive only.
 */

import type { FeatureSurface } from "@/lib/features/types";
import type { EnhanceResumeProfileInput } from "@/lib/ai/enhance-resume-for-user";
import type { ResumeEnhanceBrief } from "@/lib/job-tracker/enhance/enhance-brief";
import type {
  JobAnalysisBundle,
  LightMergeResult,
  ResumePrepBundle,
} from "@/lib/job-tracker/enhance/pipeline-track-types";
import { analyzeJobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { KeywordGapResult } from "@/lib/job-tracker/ats/keyword-gap";
import type { ResumeReadinessResult } from "@/lib/job-tracker/ats/resume-readiness-score";
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { resolveKeywordGap } from "@/lib/job-tracker/ats/resolve-keyword-gap";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";

const EMPTY_KEYWORD_GAP: KeywordGapResult = {
  matched: [],
  missing: [],
  coveragePercent: 0,
  exactCoveragePercent: 0,
  topMissing: [],
  injectable: [],
  nonInjectable: [],
};

const EMPTY_READINESS: ResumeReadinessResult = {
  total: 0,
  grade: "F",
  pillars: {
    completeness: { label: "Completeness", score: 0, maxScore: 25, details: [] },
    keywords: { label: "Keyword Match", score: 0, maxScore: 25, details: [] },
    bulletQuality: { label: "Bullet Quality", score: 0, maxScore: 25, details: [] },
    atsCompliance: { label: "ATS Compliance", score: 0, maxScore: 25, details: [] },
  },
  topActions: [],
};

const EMPTY_JOB_INTELLIGENCE: import("@/lib/job-tracker/ats/job-intelligence").JobIntelligence = {
  missingKeywords: [],
  skillsToAdd: [],
  keywordsForContent: [],
  weakBullets: [],
  structuralWarnings: [],
  coveragePercent: 0,
  hasMinimumContent: true,
};

export function buildLightEnhanceBrief(input: {
  job: JobAnalysisBundle;
  resume: ResumePrepBundle;
  merge: LightMergeResult;
  targetRole: string;
  jobDescription?: string;
  traceId: string;
  surface: FeatureSurface;
  variant: NonNullable<EnhanceResumeProfileInput["variant"]>;
  jobEntryId?: string;
}): ResumeEnhanceBrief {
  const { job, resume, merge } = input;
  const trimmedJd = input.jobDescription?.trim() ?? "";
  const prime = refineryFormToPrimeResume(merge.form, { targetRole: input.targetRole });
  const readiness =
    trimmedJd.length > 0
      ? computeResumeReadiness(
          prime,
          input.targetRole,
          trimmedJd,
          job.intelligence,
          job.platform.id,
        )
      : EMPTY_READINESS;
  const keywordGap =
    trimmedJd.length > 0
      ? resolveKeywordGap(prime, input.targetRole, trimmedJd, job.intelligence)
      : EMPTY_KEYWORD_GAP;

  const jobIntelligence =
    trimmedJd.length > 0
      ? analyzeJobIntelligence(merge.form, input.targetRole, trimmedJd)
      : EMPTY_JOB_INTELLIGENCE;

  return {
    traceId: input.traceId,
    surface: input.surface,
    variant: input.variant,
    targetRole: input.targetRole,
    hasJd: job.hasJd,
    jobEntryId: input.jobEntryId,
    jdAiCallCount: job.jdAiCallCount,
    jdAiAttempted: job.jdAiAttempted,
    jdAiSkipDetail: job.jdAiSkipDetail ?? null,
    lightPath: true,
    promptExperience: resume.promptExperience,
    experienceSourceBlob: resume.experienceSourceBlob,
    yearsExperienceEstimate: resume.yearsExperience,
    structural: {
      warnings: [],
      mashedRolesFound: resume.mashedRolesFound,
      experienceEntryCount: resume.experienceEntryCount,
      bulletCountsByRole: (resume.form.experience ?? [])
        .filter((e) => !e.hidden)
        .map((e) => (e.bullets ?? "").split("\n").filter(Boolean).length),
      pageBudget: resume.pageBudget,
    },
    summary: {
      text: resume.summaryText,
      valid: resume.summaryValidation.valid,
      warnings: resume.summaryValidation.warnings,
      sentenceCount: resume.summaryValidation.sentenceCount,
      wordCount: resume.summaryValidation.wordCount,
      bannedWords: resume.summaryValidation.bannedWords,
    },
    skills: {
      list: resume.skillsList,
      jdSkills: merge.directive.mustAddSkills.slice(0, 20),
      resumeSkills: resume.skillsList,
      warnings: [],
      banned: resume.skillsValidation.banned,
      count: resume.skillsList.length,
      compositionOk: resume.skillsValidation.compositionOk,
    },
    experience: { weakBullets: jobIntelligence.weakBullets },
    jd: job.hasJd
      ? {
          segments: job.segments,
          intelligence: job.intelligence,
          skillsVocabulary: job.skillsVocabulary,
          directive: merge.directive,
          keywordGap,
          jobIntelligence,
          atoms: [],
          anchorScores: [],
          coverageBefore: {
            tier1Total: 0,
            tier1Covered: 0,
            coveragePercent: 0,
            coveredBySection: { skills: [], summary: [], experience: [] },
            gaps: [],
          },
        }
      : undefined,
    readiness,
    plan: {
      skillsToAdd: merge.directive.mustAddSkills,
      skillsToRemove: merge.directive.mustRemoveSkills,
      weakBullets: jobIntelligence.weakBullets,
      structuralWarnings: jobIntelligence.structuralWarnings,
      summaryWarnings: resume.summaryValidation.warnings,
      skillsWarnings: [],
      targetRole: input.targetRole,
      summaryTheme: merge.directive.summaryTheme,
      roleLevel: merge.directive.roleLevel,
    },
    summaryIdentity: merge.summaryIdentity,
    roleVocabulary: resume.roleVocabulary,
    platform: job.platform,
  };
}
