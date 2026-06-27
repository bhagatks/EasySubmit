import type { FeatureSurface } from "@/lib/features/types";
import type { EnhanceResumeProfileInput } from "@/lib/ai/enhance-resume-for-user";
import type { WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { ResumeReadinessResult } from "@/lib/job-tracker/ats/resume-readiness-score";
import type { OnetRoleVocabulary } from "@/lib/job-tracker/ats/onet-service";
import type { KeywordGapResult } from "@/lib/job-tracker/ats/keyword-gap";
import type {
  JDIntelligence,
  JDSegments,
  ResumeEnhanceDirective,
} from "@/lib/job-tracker/jd/jd-intelligence";
import type { JdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import type { EnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";

export type JdAtom = {
  id: string;
  label: string;
  tier: 1 | 2 | 3;
  tokens: string[];
};

export type JdCoverageReport = {
  tier1Total: number;
  tier1Covered: number;
  coveragePercent: number;
  coveredBySection: {
    skills: string[];
    summary: string[];
    experience: string[];
  };
  gaps: Array<{
    atom: JdAtom;
    reason: "no_anchor" | "not_grounded";
    suggestedRoleIndex?: number;
  }>;
};

export type ResumeEnhanceBrief = {
  traceId: string;
  surface: FeatureSurface;
  variant: NonNullable<EnhanceResumeProfileInput["variant"]>;
  targetRole: string;
  hasJd: boolean;
  jobEntryId?: string;

  structural: {
    warnings: string[];
    mashedRolesFound: number;
    experienceEntryCount: number;
    bulletCountsByRole: number[];
    pageBudget: 1 | 2;
  };

  summary: {
    text: string;
    valid: boolean;
    warnings: string[];
    sentenceCount: number;
    wordCount: number;
    bannedWords: string[];
  };

  skills: {
    list: string[];
    jdSkills: string[];
    resumeSkills: string[];
    overflow?: string[];
    warnings: string[];
    banned: string[];
    count: number;
    compositionOk: boolean;
  };

  experience: {
    weakBullets: WeakBulletTarget[];
  };

  jd?: {
    segments: JDSegments;
    intelligence: JDIntelligence;
    skillsVocabulary: JdSkillsVocabulary;
    directive: ResumeEnhanceDirective;
    keywordGap: KeywordGapResult;
    jobIntelligence: JobIntelligence;
    atoms: JdAtom[];
    anchorScores: Array<{
      atomId: string;
      expIdx: number;
      bulletIdx: number;
      score: number;
    }>;
    coverageBefore: JdCoverageReport;
  };

  onet: OnetRoleVocabulary;
  readiness: ResumeReadinessResult;
  plan: EnhancePlan;
};

export type EnhanceSessionMeta = {
  traceId: string;
  engineMode: "ai" | "deterministic";
  aiAttempted: boolean;
  aiSucceeded: boolean;
  warning?: string;
  aiBlockCode?: string;
  enhanceSummary: string;
  coverageBefore?: JdCoverageReport;
  coverageAfter?: JdCoverageReport;
  skillsGaps?: string[];
  readinessDelta?: { before: number; after: number };
};
