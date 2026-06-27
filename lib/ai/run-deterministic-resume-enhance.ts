import type { EnhanceResumeProfileInput, EnhanceResumeProfileSuccess } from "@/lib/ai/enhance-resume-for-user";
import { buildEnhanceIntelligenceContext } from "@/lib/ai/build-enhance-intelligence-context";
import { buildOnboardingIntelligenceContext } from "@/lib/ai/build-onboarding-intelligence-context";
import { deterministicEnhance } from "@/lib/job-tracker/ats/deterministic-enhancer";
import { diffChangedSections, postProcessProfessionalSummary, postProcessSkillsText } from "@/src/lib/ai/engine/post-process";
import { buildQuotaSnapshot } from "@/src/lib/ai/engine/quota";
import { logEnhance, summarizeFormDelta } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

export async function runDeterministicResumeEnhance(input: {
  userId: string;
  user: SystemQuotaUserRow;
  enhanceInput: EnhanceResumeProfileInput;
  aiEngine: AiEngineConfig;
  traceId: string;
  aiDisabled?: boolean;
}): Promise<EnhanceResumeProfileSuccess> {
  const hasJd = Boolean(input.enhanceInput.jobDescription?.trim());

  let jobIntelligence: Awaited<ReturnType<typeof buildEnhanceIntelligenceContext>>["jobIntelligence"];
  let enhanceDirective: Awaited<ReturnType<typeof buildEnhanceIntelligenceContext>>["enhanceDirective"];

  if (hasJd) {
    const ctx = await buildEnhanceIntelligenceContext({
      form: input.enhanceInput.form,
      targetRole: input.enhanceInput.targetRole,
      jobDescription: input.enhanceInput.jobDescription,
      jobEntryId: input.enhanceInput.jobEntryId,
      traceId: input.traceId,
      userId: input.userId,
    });
    jobIntelligence = ctx.jobIntelligence;
    enhanceDirective = ctx.enhanceDirective;
  } else {
    const ctx = await buildOnboardingIntelligenceContext(
      input.enhanceInput.form,
      input.enhanceInput.targetRole,
      input.traceId,
      input.userId,
    );
    jobIntelligence = ctx.intelligence;
    enhanceDirective = ctx.directive;
  }

  logEnhance("server", "action.deterministic.start", {
    traceId: input.traceId,
    step: ENHANCE_PIPELINE.SERVER_ROUTE,
    userId: input.userId,
    aiDisabled: Boolean(input.aiDisabled),
  });

  const fallback = deterministicEnhance(
    input.enhanceInput.form,
    jobIntelligence!,
    enhanceDirective,
    input.enhanceInput.targetRole,
  );

  const cleanedSummary = postProcessProfessionalSummary(
    fallback.form.professionalSummary ?? "",
    input.traceId,
    input.userId,
  );
  const cleanedSkills = postProcessSkillsText(
    fallback.form.skillsText ?? "",
    input.traceId,
    input.userId,
  );
  const cleanedForm = {
    ...fallback.form,
    professionalSummary: cleanedSummary,
    skillsText: cleanedSkills,
  };

  const changedSections = diffChangedSections(input.enhanceInput.form, fallback.form, false);

  logEnhance("server", "action.deterministic.success", {
    traceId: input.traceId,
    step: ENHANCE_PIPELINE.SERVER_SUCCESS,
    userId: input.userId,
    skillsAdded: fallback.changes.skillsAdded,
    bulletsRewritten: fallback.changes.bulletsRewritten,
    delta: summarizeFormDelta(input.enhanceInput.form, fallback.form),
  });

  const quota = buildQuotaSnapshot(input.user, input.aiEngine, "system");

  return {
    success: true,
    form: cleanedForm,
    changedSections,
    targetRole: input.enhanceInput.targetRole,
    quota: {
      enhancementsUsed: quota.enhancementsUsed,
      enhancementsLimit: quota.enhancementsLimit,
      callsUsed: quota.callsUsed,
      callsLimit: quota.callsLimit,
    },
    aiMode: "system",
    engineMode: "deterministic" as const,
    fallbackSummary: fallback.summary,
    ...(input.aiDisabled ? { aiDisabled: true } : {}),
  };
}
