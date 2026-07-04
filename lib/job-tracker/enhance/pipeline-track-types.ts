import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { AtsPlatform, PlatformStrategy } from "@/lib/job-tracker/ats/platform-rules";
import type {
  JDIntelligence,
  JDSegments,
  ResumeEnhanceDirective,
} from "@/lib/job-tracker/jd/jd-intelligence";
import type { JdSkillsVocabulary } from "@/lib/job-tracker/jd/jd-skills-types";
import type { SummaryIdentityResolution } from "@/lib/job-tracker/enhance/resolve-summary-identity";
import type { PipelineDebugHookContext } from "@/lib/extension/pipeline-debug-hooks";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

/** Job track output — no profile content. */
export type JobAnalysisBundle = {
  descriptionHash: string;
  segments: JDSegments;
  intelligence: JDIntelligence;
  skillsVocabulary: JdSkillsVocabulary;
  jdAiAttempted: boolean;
  jdAiCallCount: number;
  cacheHit: boolean;
  hasJd: boolean;
  platform: {
    id: AtsPlatform;
    label: string;
    strategy: PlatformStrategy;
    strategyInstructions: string;
    tip: string;
  };
};

/** Resume track output — no JD content. */
export type ResumePrepBundle = {
  form: HubRefineryForm;
  sourceProfileId: string;
  profileTargetTitle: string;
  skillsList: string[];
  summaryText: string;
  pageBudget: 1 | 2;
  yearsExperience: number;
  senioritySignal: string;
  /** Slim experience for resume AI prompt (fact ledger). */
  promptExperience: HubRefineryForm["experience"];
  /** Full experience blob for post-AI grounding. */
  experienceSourceBlob: string;
  summaryValidation: {
    valid: boolean;
    sentenceCount: number;
    wordCount: number;
    bannedWords: string[];
    warnings: string[];
  };
  skillsValidation: {
    compositionOk: boolean;
    banned: string[];
  };
  mashedRolesFound: number;
  experienceEntryCount: number;
  profileUpdatedAt: string | null;
};

export type RunJobAnalysisTrackInput = {
  userId: string;
  jobEntryId: string;
  jobDescription?: string | null;
  targetRole: string;
  companyName?: string | null;
  aiRoute?: ResolvedAiRoute | null;
  quotaUser?: SystemQuotaUserRow | null;
  traceId: string;
  pipelineDebug?: PipelineDebugHookContext | null;
};

export type RunResumePrepTrackInput = {
  userId: string;
  jobEntryId: string;
  sourceProfileId?: string | null;
  targetRole: string;
  form?: HubRefineryForm;
  profileTargetTitle?: string;
  traceId: string;
  pipelineDebug?: PipelineDebugHookContext | null;
};

export type LightMergeResult = {
  form: HubRefineryForm;
  skillsAdded: string[];
  skillsToRemove: string[];
  directive: ResumeEnhanceDirective;
  summaryIdentity: SummaryIdentityResolution;
};
