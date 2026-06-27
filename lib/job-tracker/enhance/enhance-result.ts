import type { EnhanceOffReason } from "@/lib/features/types";
import type { EnhanceResumeProfileFailure } from "@/lib/ai/enhance-resume-for-user";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import type {
  EnhanceSessionMeta,
  JdCoverageReport,
  ResumeEnhanceBrief,
} from "@/lib/job-tracker/enhance/enhance-brief";

export type EnhanceRunSuccess = {
  success: true;
  form: HubRefineryForm;
  baselineForm: HubRefineryForm;
  brief: ResumeEnhanceBrief;
  changedSections: StudioEditorSectionId[];
  targetRole: string;

  engineMode: "ai" | "deterministic";
  baselineApplied: true;
  aiAttempted: boolean;
  aiSucceeded: boolean;
  warning?: string;
  aiBlockCode?: EnhanceOffReason | "parse_fail" | "timeout" | "provider_error";

  coverageAfter?: JdCoverageReport;
  readinessDelta?: { before: number; after: number };

  quota: {
    enhancementsUsed: number;
    enhancementsLimit: number;
    callsUsed: number;
    callsLimit: number;
  };
  aiMode: "customer" | "system";
  enhanceSummary: string;
  partialEnhance?: boolean;
  traceId: string;
  sessionMeta: EnhanceSessionMeta;
  skillsAdded: string[];
  aiDisabled?: boolean;
};

export type EnhanceRunResult = EnhanceRunSuccess | EnhanceResumeProfileFailure;

export type ResumeEnhancePipelineInput = {
  userId: string;
  user: import("@/src/lib/ai/engine/system-quota-gate").SystemQuotaUserRow;
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  jobEntryId?: string;
  rawResumeText?: string | null;
  surface: import("@/lib/features/types").FeatureSurface;
  variant: NonNullable<import("@/lib/ai/enhance-resume-for-user").EnhanceResumeProfileInput["variant"]>;
  traceId: string;
  allowAiUpgrade?: boolean;
  forceSystem?: boolean;
  useCustomerKey?: boolean;
};
