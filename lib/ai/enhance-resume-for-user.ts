import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { prisma } from "@/lib/prisma";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
import { runResumeEnhancePipeline } from "@/lib/job-tracker/enhance/run-resume-enhance-pipeline";
import type { EnhanceSessionMeta } from "@/lib/job-tracker/enhance/enhance-brief";
import {
  logEnhance,
  summarizeEnhanceRequest,
  summarizeEnhanceResult,
} from "@/src/lib/ai/engine/enhance-logger";
import { logEnhanceDiag } from "@/src/lib/ai/engine/enhance-diagnostics";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import type { FeatureSurface } from "@/lib/features/types";

export type EnhanceResumeProfileInput = {
  profileId?: string;
  jobEntryId?: string;
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  companyName?: string | null;
  rawResumeText?: string | null;
  forceSystem?: boolean;
  forceAiEnabled?: boolean;
  allowAiUpgrade?: boolean;
  useCustomerKey?: boolean;
  profileTargetTitle?: string;
  traceId?: string;
  variant?: "dashboard" | "onboarding" | "pipeline";
};

export type EnhanceResumeProfileSuccess = {
  success: true;
  form: HubRefineryForm;
  changedSections: StudioEditorSectionId[];
  targetRole: string;
  quota: {
    enhancementsUsed: number;
    enhancementsLimit: number;
    callsUsed: number;
    callsLimit: number;
  };
  aiMode: "customer" | "system";
  warning?: string;
  engineMode: "ai" | "deterministic";
  fallbackSummary?: string;
  enhanceSummary?: string;
  aiDisabled?: boolean;
  baselineApplied?: boolean;
  aiAttempted?: boolean;
  aiSucceeded?: boolean;
  aiBlockCode?: string;
  action?: import("@/lib/ai/call-kernel/types").AiEnhanceOutcomeAction;
  actionHref?: string | null;
  coverageAfter?: EnhanceSessionMeta["coverageAfter"];
  readinessDelta?: EnhanceSessionMeta["readinessDelta"];
  sessionMeta?: EnhanceSessionMeta;
  coherenceWarnings?: string[];
  suggestedTargetRoles?: string[];
  isCrossDomain?: boolean;
};

export type EnhanceResumeProfileFailure = {
  success: false;
  error: string;
  byokAvailable?: boolean;
  code?:
    | "unauthorized"
    | "quota_enhancement"
    | "quota_calls"
    | "no_system_key"
    | "no_customer_key"
    | "system_pool_exhausted"
    | "provider_error"
    | "rate_limited"
    | "insufficient_quota"
    | "invalid_response"
    | "capacity_exhausted"
    | "feature_disabled";
};

export type EnhanceResumeProfileResult =
  | EnhanceResumeProfileSuccess
  | EnhanceResumeProfileFailure;

function surfaceFromVariant(
  variant: EnhanceResumeProfileInput["variant"],
  jobDescription?: string,
): FeatureSurface {
  if (variant === "onboarding") return "onboarding";
  if (variant === "pipeline") return "extension";
  if (!jobDescription?.trim()) return "resume";
  return "job_apply";
}

/** Bearer-safe Enhance — used by extension pipeline (no NextAuth session). */
export async function enhanceResumeForUserId(
  userId: string,
  input: EnhanceResumeProfileInput,
): Promise<EnhanceResumeProfileResult> {
  const startedAt = Date.now();
  const traceId = input.traceId ?? "no-trace";
  const surface = surfaceFromVariant(input.variant, input.jobDescription);

  logEnhance("server", "action.start", {
    ...summarizeEnhanceRequest(input),
    step: ENHANCE_PIPELINE.SERVER_ACTION_START,
    traceId,
    userId,
    surface,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SYSTEM_QUOTA_USER_SELECT,
  });

  if (!user) {
    logEnhance("server", "action.denied", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      reason: "user_not_found",
      userId,
    });
    logEnhanceDiag({
      traceId,
      designStep: "0",
      track: "gate",
      pipelineStep: ENHANCE_PIPELINE.SERVER_FAIL,
      phase: "fail",
      level: "high",
      event: "action.denied",
      scope: "server",
      userId,
      errorCode: "unauthorized",
      errorMessage: "user_not_found",
      surface,
    });
    return { success: false, error: "Account not found.", code: "unauthorized" };
  }

  const allowAiUpgrade =
    input.allowAiUpgrade ??
    (input.variant !== "onboarding" && surface !== "onboarding");

  const result = await runResumeEnhancePipeline({
    userId,
    user,
    form: input.form,
    targetRole: input.targetRole,
    profileTargetTitle: input.profileTargetTitle,
    jobDescription: input.jobDescription,
    jobEntryId: input.jobEntryId,
    companyName: input.companyName,
    rawResumeText: input.rawResumeText,
    surface,
    variant: input.variant ?? "dashboard",
    traceId,
    allowAiUpgrade,
    forceSystem: input.forceSystem,
    forceAiEnabled: input.forceAiEnabled,
    useCustomerKey: input.useCustomerKey,
  });

  if (!result.success) {
    return result;
  }

  const response: EnhanceResumeProfileSuccess = {
    success: true,
    form: result.form,
    changedSections: result.changedSections,
    targetRole: result.targetRole,
    quota: result.quota,
    aiMode: result.aiMode,
    engineMode: result.engineMode,
    baselineApplied: result.baselineApplied,
    aiAttempted: result.aiAttempted,
    aiSucceeded: result.aiSucceeded,
    enhanceSummary: result.enhanceSummary,
    fallbackSummary: result.warning ?? result.enhanceSummary,
    sessionMeta: result.sessionMeta,
    coverageAfter: result.coverageAfter,
    readinessDelta: result.readinessDelta,
    ...(result.warning ? { warning: result.warning } : {}),
    ...(result.aiBlockCode ? { aiBlockCode: result.aiBlockCode } : {}),
    ...(result.action ? { action: result.action } : {}),
    ...(result.actionHref ? { actionHref: result.actionHref } : {}),
    ...(result.aiDisabled ? { aiDisabled: true } : {}),
    ...(result.coherenceWarnings?.length ? { coherenceWarnings: result.coherenceWarnings } : {}),
  };

  logEnhance("server", "action.success", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_SUCCESS,
    userId,
    engineMode: result.engineMode,
    aiSucceeded: result.aiSucceeded,
    ...summarizeEnhanceResult({
      changedSections: result.changedSections,
      aiMode: result.aiMode,
      quota: result.quota,
      tokensUsed: 0,
      modelId: result.engineMode,
      apiCallCount: 0,
      estimatedCost: 0,
      durationMs: Date.now() - startedAt,
    }),
  });

  return response;
}
