import type { FeatureSurface } from "@/lib/features/types";
import type { EnhanceResumeProfileInput } from "@/lib/ai/enhance-resume-for-user";
import type { WeakBulletTarget } from "@/lib/job-tracker/ats/job-intelligence";
import type { JobIntelligence } from "@/lib/job-tracker/ats/job-intelligence";
import type { ResumeReadinessResult } from "@/lib/job-tracker/ats/resume-readiness-score";
import type { KeywordGapResult } from "@/lib/job-tracker/ats/keyword-gap";
import type {
  JDIntelligence,
  JDSegments,
  ResumeEnhanceDirective,
} from "@/lib/job-tracker/jd/jd-intelligence";
import type { JdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import type { EnhancePlan } from "@/lib/job-tracker/enhance/enhance-plan";
import type { SummaryIdentityResolution } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import type { AtsPlatform, PlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";

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
  /** AI JD extract calls made during brief build (0 or 1). Counted toward daily quota. */
  jdAiCallCount: number;
  /** True when JD AI extract was attempted during brief build. */
  jdAiAttempted: boolean;
  /** Pipeline debug detail when JD AI extract was skipped. */
  jdAiSkipDetail?: string | null;
  /**
   * Happy-path fork/join brief — skills merge only; skip readiness/gap/weak-bullet prompt bloat.
   * Full brief is built lazily on AI failure for deterministic fallback.
   */
  lightPath?: boolean;
  /** Slim experience for resume AI prompt (fact ledger). Full form.experience stays for grounding. */
  promptExperience?: import("@/lib/onboarding/hubResume").HubRefineryForm["experience"];
  /** Full experience text for post-AI summary grounding. */
  experienceSourceBlob?: string;
  /** Years estimate for light-path summary instructions. */
  yearsExperienceEstimate?: number;

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

  readiness: ResumeReadinessResult;
  plan: EnhancePlan;
  /** Candidate identity for summary sentence 1 (not JD job title). */
  summaryIdentity: SummaryIdentityResolution;
  /** Detected ATS platform + strategy emphasis for this job. */
  platform: {
    id: AtsPlatform;
    label: string;
    strategy: PlatformStrategy;
    strategyInstructions: string;
    tip: string;
  };
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
  coherenceWarnings?: string[];
};
