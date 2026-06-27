import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import { prisma } from "@/lib/prisma";
import { applyBaselineEnhance } from "@/lib/job-tracker/enhance/apply-baseline-enhance";
import { buildEnhanceBrief } from "@/lib/job-tracker/enhance/build-enhance-brief";
import type { EnhanceSessionMeta } from "@/lib/job-tracker/enhance/enhance-brief";
import type { EnhanceOffReason } from "@/lib/features/types";
import type { EnhanceRunResult, ResumeEnhancePipelineInput } from "@/lib/job-tracker/enhance/enhance-result";
import { resolveAiUpgrade } from "@/lib/job-tracker/enhance/resolve-ai-upgrade";
import { diffChangedSections } from "@/src/lib/ai/engine/post-process";
import {
  buildQuotaSnapshot,
  incrementQuotaPatch,
  type AiQuotaMode,
} from "@/src/lib/ai/engine/quota";
import { runResumeEnhance } from "@/src/lib/ai/engine/run-enhance";
import {
  resolveQuotaRowWithReset,
  SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS,
  SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS,
} from "@/src/lib/ai/engine/system-quota-gate";
import { getAppConfig } from "@/src/lib/services/config-service";
import { logEnhance, logJourneyStep, RESUME_JOURNEY, resolveJourneyAiCallStatus, summarizeFormDelta } from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";

const MIN_JD_CHARS = 120;

function needsJd(input: ResumeEnhancePipelineInput): boolean {
  return input.surface === "extension" || input.surface === "job_apply";
}

export async function runResumeEnhancePipeline(
  input: ResumeEnhancePipelineInput,
): Promise<EnhanceRunResult> {
  const { userId, user, traceId } = input;
  const aiEngine = await getAppConfig("aiEngine");

  if (needsJd(input) && (input.jobDescription?.trim().length ?? 0) < MIN_JD_CHARS) {
    return {
      success: false,
      error: "Job description is too short to tailor your resume.",
      code: "provider_error",
    };
  }

  logJourneyStep("server", "pipeline.start", {
    traceId,
    userId,
    step: ENHANCE_PIPELINE.BASELINE_START,
    journey: RESUME_JOURNEY.ANALYZE,
    surface: input.surface,
    variant: input.variant,
    aiUsed: false,
    aiCallStatus: "skipped",
  });

  const allowAi =
    input.allowAiUpgrade !== false &&
    input.surface !== "onboarding" &&
    input.variant !== "onboarding";

  let aiUpgrade: Awaited<ReturnType<typeof resolveAiUpgrade>> | null = null;
  if (allowAi) {
    aiUpgrade = await resolveAiUpgrade(user, input.surface, {
      forceSystem: input.forceSystem,
      useCustomerKey: input.useCustomerKey,
    });
  }

  let brief;
  try {
    brief = await buildEnhanceBrief({
      form: input.form,
      targetRole: input.targetRole,
      jobDescription: input.jobDescription,
      jobEntryId: input.jobEntryId,
      surface: input.surface,
      variant: input.variant,
      traceId,
      userId,
      aiRoute: aiUpgrade?.route ?? null,
    });
  } catch (err) {
    logEnhance("server", "pipeline.brief.error", {
      traceId,
      userId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      error: "Could not analyze resume for enhancement.",
      code: "provider_error",
    };
  }

  const readinessBefore = brief.readiness.total;

  let baseline;
  try {
    baseline = applyBaselineEnhance(input.form, brief, traceId, userId);
  } catch (err) {
    logEnhance("server", "pipeline.baseline.error", {
      traceId,
      userId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      error: "Baseline enhancement failed.",
      code: "provider_error",
    };
  }

  logJourneyStep("server", "pipeline.baseline.done", {
    traceId,
    userId,
    step: ENHANCE_PIPELINE.BASELINE_DONE,
    journey: RESUME_JOURNEY.BASELINE,
    skillsAdded: baseline.changes.skillsAdded.length,
    bulletsWoven: baseline.changes.bulletsWoven,
    coverageAfter: baseline.coverageAfter?.coveragePercent ?? null,
    delta: summarizeFormDelta(input.form, baseline.form),
    aiUsed: false,
    aiCallStatus: "skipped",
  });

  let finalForm = baseline.form;
  let aiAttempted = false;
  let aiSucceeded = false;
  let warning: string | undefined;
  let aiBlockCode: EnhanceOffReason | "parse_fail" | "timeout" | "provider_error" | undefined;
  let engineMode: "ai" | "deterministic" = "deterministic";
  let partialEnhance: boolean | undefined;
  let aiMode: AiQuotaMode = "system";
  let tokensUsed = 0;
  let apiCallCount = 0;
  let modelId = "deterministic";
  let estimatedCost = 0;

  if (allowAi && aiUpgrade) {
    if (aiUpgrade.aiAllowed && aiUpgrade.route) {
      aiAttempted = true;
      aiMode = aiUpgrade.route.mode;
      const pricingMap = await getAppConfig("ai_pricing_map");
      const estimatedCalls = input.jobDescription?.trim()
        ? SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS
        : SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS;

      logEnhance("server", "pipeline.ai.start", {
        traceId,
        userId,
        step: ENHANCE_PIPELINE.AI_UPGRADE_START,
        estimatedCalls,
      });

      const result = await runResumeEnhance(
        {
          form: baseline.form,
          targetRole: input.targetRole,
          jobDescription: input.jobDescription,
          rawResumeText: input.rawResumeText,
          route: aiUpgrade.route,
          traceId,
          userId,
          jobIntelligence: brief.jd?.jobIntelligence,
          enhanceDirective: brief.jd?.directive,
          brief,
        },
        pricingMap,
      );

      if (result.ok) {
        aiSucceeded = true;
        finalForm = result.form;
        engineMode = "ai";
        estimatedCost = result.estimatedCost;
        tokensUsed = result.tokensUsed;
        apiCallCount = result.apiCallCount;
        modelId = result.modelId;
        partialEnhance = result.partialEnhance;
        if (result.partialEnhance) {
          warning =
            result.partialEnhanceMessage ??
            "Job-specific optimization was incomplete. Baseline enhancements were kept.";
        }

        logEnhance("server", "pipeline.ai.success", {
          traceId,
          userId,
          step: ENHANCE_PIPELINE.AI_UPGRADE_SUCCESS,
          tokensUsed,
          apiCallCount,
        });
      } else {
        warning = result.error;
        aiBlockCode = (result.code ?? "provider_error") as typeof aiBlockCode;
        logEnhance("server", "pipeline.ai.fail", {
          traceId,
          userId,
          step: ENHANCE_PIPELINE.AI_UPGRADE_FAIL,
          code: result.code,
        });
      }
    } else {
      warning = aiUpgrade.warning;
      aiBlockCode = aiUpgrade.reason;
      logEnhance("server", "pipeline.ai.blocked", {
        traceId,
        userId,
        step: ENHANCE_PIPELINE.AI_UPGRADE_BLOCKED,
        reason: aiUpgrade.reason ?? null,
      });
    }
  } else {
    logEnhance("server", "pipeline.ai.skipped", {
      traceId,
      userId,
      step: ENHANCE_PIPELINE.AI_UPGRADE_BLOCKED,
      reason: "onboarding_or_disabled",
    });
  }

  const changedSections = diffChangedSections(input.form, finalForm, false);
  const readinessAfter = brief.readiness.total;
  const readinessDelta = {
    before: readinessBefore,
    after: readinessAfter,
  };

  const { quotaRow, resetPatch } = resolveQuotaRowWithReset(user);

  if (aiSucceeded) {
    const increment = incrementQuotaPatch(quotaRow, aiEngine, {
      isEnhancement: true,
      callCount: apiCallCount,
      mode: aiMode,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(resetPatch ?? {}),
        ...increment,
      },
    });

    if (tokensUsed > 0) {
      await recordUsageLogForUser(userId, {
        tokensUsed,
        modelId,
        estimatedCost,
      });
    }
  } else if (resetPatch) {
    await prisma.user.update({ where: { id: userId }, data: resetPatch });
  }

  const incrementForSnapshot = aiSucceeded
    ? incrementQuotaPatch(quotaRow, aiEngine, {
        isEnhancement: true,
        callCount: apiCallCount,
        mode: aiMode,
      })
    : { aiEnhancementsToday: quotaRow.aiEnhancementsToday, aiCallsToday: quotaRow.aiCallsToday };

  const quotaSnapshot = buildQuotaSnapshot(
    { ...quotaRow, ...incrementForSnapshot },
    aiEngine,
    aiMode,
  );

  const enhanceSummary = baseline.enhanceSummary;

  const sessionMeta: EnhanceSessionMeta = {
    traceId,
    engineMode,
    aiAttempted,
    aiSucceeded,
    warning,
    aiBlockCode,
    enhanceSummary,
    coverageBefore: brief.jd?.coverageBefore,
    coverageAfter: baseline.coverageAfter,
    skillsGaps: baseline.coverageAfter?.gaps.map((g) => g.atom.label),
    readinessDelta,
  };

  logJourneyStep("server", "pipeline.complete", {
    traceId,
    userId,
    step: ENHANCE_PIPELINE.SERVER_SUCCESS,
    journey: RESUME_JOURNEY.APPLY_READY,
    surface: input.surface,
    aiUsed: aiAttempted,
    aiCallStatus: resolveJourneyAiCallStatus({
      aiUsed: aiAttempted,
      aiSucceeded,
      blocked: Boolean(aiBlockCode && !aiAttempted),
    }),
    engineMode,
    errorCode: aiBlockCode ?? null,
    status: "success",
    apiCallCount,
    tokensUsed,
  });

  return {
    success: true,
    form: finalForm,
    baselineForm: baseline.form,
    brief,
    changedSections,
    targetRole: input.targetRole,
    engineMode,
    baselineApplied: true,
    aiAttempted,
    aiSucceeded,
    warning,
    aiBlockCode,
    coverageAfter: baseline.coverageAfter,
    readinessDelta,
    quota: {
      enhancementsUsed: quotaSnapshot.enhancementsUsed,
      enhancementsLimit: quotaSnapshot.enhancementsLimit,
      callsUsed: quotaSnapshot.callsUsed,
      callsLimit: quotaSnapshot.callsLimit,
    },
    aiMode,
    enhanceSummary,
    partialEnhance,
    traceId,
    sessionMeta,
    skillsAdded: baseline.changes.skillsAdded,
    ...(input.surface === "onboarding" || !allowAi ? { aiDisabled: true } : {}),
  };
}
