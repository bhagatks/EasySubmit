import type { EnhanceResumeProfileInput, EnhanceResumeProfileSuccess } from "@/lib/ai/enhance-resume-for-user";
import { runResumeEnhancePipeline } from "@/lib/job-tracker/enhance/run-resume-enhance-pipeline";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

/** @deprecated Use runResumeEnhancePipeline directly. */
export async function runDeterministicResumeEnhance(input: {
  userId: string;
  user: SystemQuotaUserRow;
  enhanceInput: EnhanceResumeProfileInput;
  aiEngine: AiEngineConfig;
  traceId: string;
  aiDisabled?: boolean;
}): Promise<EnhanceResumeProfileSuccess> {
  void input.aiEngine;
  const surface =
    input.enhanceInput.variant === "onboarding"
      ? "onboarding"
      : input.enhanceInput.jobDescription?.trim()
        ? "job_apply"
        : "resume";

  const result = await runResumeEnhancePipeline({
    userId: input.userId,
    user: input.user,
    form: input.enhanceInput.form,
    targetRole: input.enhanceInput.targetRole,
    jobDescription: input.enhanceInput.jobDescription,
    jobEntryId: input.enhanceInput.jobEntryId,
    rawResumeText: input.enhanceInput.rawResumeText,
    surface,
    variant: input.enhanceInput.variant ?? "dashboard",
    traceId: input.traceId,
    allowAiUpgrade: false,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return {
    success: true,
    form: result.form,
    changedSections: result.changedSections,
    targetRole: result.targetRole,
    quota: result.quota,
    aiMode: result.aiMode,
    engineMode: "deterministic",
    fallbackSummary: result.enhanceSummary,
    enhanceSummary: result.enhanceSummary,
    aiDisabled: input.aiDisabled,
    baselineApplied: true,
    aiAttempted: false,
    aiSucceeded: false,
    sessionMeta: result.sessionMeta,
  };
}
