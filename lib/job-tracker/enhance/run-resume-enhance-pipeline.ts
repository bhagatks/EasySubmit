import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import { prisma } from "@/lib/prisma";
import { applyBaselineEnhance } from "@/lib/job-tracker/enhance/apply-baseline-enhance";
import { buildEnhanceBrief } from "@/lib/job-tracker/enhance/build-enhance-brief";
import type { EnhanceSessionMeta } from "@/lib/job-tracker/enhance/enhance-brief";
import type { EnhanceOffReason } from "@/lib/features/types";
import type { EnhanceRunResult, ResumeEnhancePipelineInput } from "@/lib/job-tracker/enhance/enhance-result";
import { resolveAiUpgrade } from "@/lib/job-tracker/enhance/resolve-ai-upgrade";
import {
  pipelineDebugAdvance,
  pipelineDebugContext,
  pipelineDebugStep,
} from "@/lib/extension/pipeline-debug-hooks";
import {
  featureFlagsArtifacts,
  formDeltaArtifacts,
} from "@/lib/extension/pipeline-debug-artifact-builders";
import { dataArtifact } from "@/lib/extension/pipeline-debug-sanitize";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import {
  logEnhance,
  logJourneyStep,
  RESUME_JOURNEY,
  resolveJourneyAiCallStatus,
  sanitizeRouteForLog,
  summarizeFormDelta,
} from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import {
  beginEnhanceDiagnosticSession,
  endEnhanceDiagnosticSession,
  logEnhanceDiag,
} from "@/src/lib/ai/engine/enhance-diagnostics";
import {
  experienceBlobFromForm,
  normalizeExperienceDateFields,
  postProcessSummaryOutput,
} from "@/lib/job-tracker/enhance/summary-grounding";
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
import { computeResumeReadiness } from "@/lib/job-tracker/ats/resume-readiness-score";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";

import {
  hasFullJd,
  MIN_JD_CHARS,
  resolveDeterministicFallbackWarning,
  resolveEnhanceContextRequirement,
} from "@/lib/job-tracker/enhance/max-ats-helpers";

async function resolveJobCompanyName(
  jobEntryId: string | undefined,
  provided?: string | null,
): Promise<string | null> {
  if (provided?.trim()) return provided.trim();
  if (!jobEntryId) return null;
  const entry = await prisma.jobTrackerEntry.findUnique({
    where: { id: jobEntryId },
    select: { company: true },
  });
  return entry?.company?.trim() || null;
}

function needsJd(input: ResumeEnhancePipelineInput): boolean {
  return input.surface === "extension" || input.surface === "job_apply";
}

export async function runResumeEnhancePipeline(
  input: ResumeEnhancePipelineInput,
): Promise<EnhanceRunResult> {
  const { userId, user, traceId } = input;
  await beginEnhanceDiagnosticSession(traceId);

  try {
    return await runResumeEnhancePipelineInner(input);
  } finally {
    endEnhanceDiagnosticSession(traceId);
  }
}

async function runResumeEnhancePipelineInner(
  input: ResumeEnhancePipelineInput,
): Promise<EnhanceRunResult> {
  const { userId, user, traceId } = input;
  const aiEngine = await getAppConfig("aiEngine");
  const debug = pipelineDebugContext(userId, input.jobEntryId);

  logEnhanceDiag({
    traceId,
    designStep: "2",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.BASELINE_START,
    phase: "start",
    level: "high",
    event: "pipeline.input",
    scope: "server",
    userId,
    surface: input.surface,
    variant: input.variant,
    params: {
      targetRole: input.targetRole,
      jobDescriptionChars: input.jobDescription?.trim().length ?? 0,
      allowAiUpgrade: input.allowAiUpgrade !== false,
      forceSystem: input.forceSystem ?? false,
      useCustomerKey: input.useCustomerKey ?? true,
    },
  });

  if (needsJd(input)) {
    const companyName = await resolveJobCompanyName(input.jobEntryId, input.companyName);
    const context = resolveEnhanceContextRequirement({
      jobDescription: input.jobDescription,
      targetRole: input.targetRole,
      companyName,
    });
    if (!context.ok) {
      logEnhanceDiag({
        traceId,
        designStep: "2",
        track: "resume",
        pipelineStep: ENHANCE_PIPELINE.SERVER_FAIL,
        phase: "fail",
        level: "high",
        event: "pipeline.context_insufficient",
        scope: "server",
        userId,
        errorCode: "provider_error",
        params: { minJdChars: MIN_JD_CHARS, hasCompany: Boolean(companyName?.trim()) },
      });
      return {
        success: false,
        error: context.error,
        code: "provider_error",
      };
    }
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
      traceId,
    });
    logEnhanceDiag({
      traceId,
      designStep: "11",
      track: "gate",
      pipelineStep: aiUpgrade.aiAllowed
        ? ENHANCE_PIPELINE.AI_UPGRADE_START
        : ENHANCE_PIPELINE.AI_UPGRADE_BLOCKED,
      phase: aiUpgrade.aiAllowed ? "done" : "block",
      level: "high",
      event: "pipeline.ai_upgrade_resolution",
      scope: "server",
      userId,
      surface: input.surface,
      errorCode: aiUpgrade.aiAllowed ? null : (aiUpgrade.reason ?? null),
      flags: {
        aiAllowed: aiUpgrade.aiAllowed,
        routeMode: aiUpgrade.route?.mode ?? null,
        modelId: aiUpgrade.route?.modelId ?? null,
      },
    });
  }

  let brief;
  try {
    pipelineDebugAdvance(debug, "pre_validate", "pre_intelligence");
    brief = await buildEnhanceBrief({
      form: input.form,
      targetRole: input.targetRole,
      profileTargetTitle: input.profileTargetTitle,
      jobDescription: input.jobDescription,
      jobEntryId: input.jobEntryId,
      surface: input.surface,
      variant: input.variant,
      traceId,
      userId,
      quotaUser: user,
      aiRoute: aiUpgrade?.route ?? null,
      pipelineDebug: debug ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logEnhance("server", "pipeline.brief.error", {
      traceId,
      userId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      message,
    });
    logEnhanceDiag({
      traceId,
      designStep: "9",
      track: "jd",
      pipelineStep: ENHANCE_PIPELINE.SERVER_FAIL,
      phase: "fail",
      level: "high",
      event: "pipeline.brief.error",
      scope: "server",
      userId,
      errorCode: "provider_error",
      errorMessage: message,
    });
    return {
      success: false,
      error: "Could not analyze resume for enhancement.",
      code: "provider_error",
    };
  }

  pipelineDebugAdvance(debug, "ai_gates", "pre_plan", {
    detail: "Pre-process brief ready",
  });

  logEnhanceDiag({
    traceId,
    designStep: "9",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.PRE_BRIEF_READY,
    phase: "done",
    level: "low",
    event: "pipeline.platform_strategy",
    scope: "server",
    userId,
    params: {
      atsPlatform: brief.platform.id,
      atsStrategy: brief.platform.strategy,
      platformLabel: brief.platform.label,
    },
  });

  const featureFlags = await getFeatureFlags();
  if (allowAi && aiUpgrade) {
    if (aiUpgrade.aiAllowed && aiUpgrade.route) {
      pipelineDebugStep(debug, "ai_gates", {
        status: "done",
        detail: "AI allowed",
        meta: {
          routeMode: aiUpgrade.route.mode,
          provider:
            aiUpgrade.route.mode === "customer" ? aiUpgrade.route.provider : "system",
          modelId: aiUpgrade.route.modelId,
          vaultKeyId:
            aiUpgrade.route.mode === "customer" ? aiUpgrade.route.vaultKeyId : null,
        },
        artifacts: featureFlagsArtifacts(featureFlags, {
          aiAllowed: true,
          route: sanitizeRouteForLog(aiUpgrade.route),
          quota: brief.readiness,
        }),
      });
    } else {
      pipelineDebugStep(debug, "ai_gates", {
        status: "done",
        detail: aiUpgrade.warning ?? "AI blocked — baseline only",
        meta: {
          aiAllowed: false,
          reason: aiUpgrade.reason ?? null,
        },
        artifacts: featureFlagsArtifacts(featureFlags, {
          aiAllowed: false,
          reason: aiUpgrade.reason ?? null,
        }),
      });
      pipelineDebugStep(debug, "ai_pass1", {
        status: "skipped",
        detail: aiUpgrade.reason ?? "AI not available",
      });
      pipelineDebugStep(debug, "ai_pass2", {
        status: "skipped",
        detail: aiUpgrade.reason ?? "AI not available",
      });
    }
  } else {
    pipelineDebugStep(debug, "ai_gates", {
      status: "skipped",
      detail: "Onboarding or AI upgrade disabled for surface",
    });
    pipelineDebugStep(debug, "ai_pass1", { status: "skipped", detail: "Surface skips AI" });
    pipelineDebugStep(debug, "ai_pass2", { status: "skipped", detail: "Surface skips AI" });
  }

  if (brief.jdAiCallCount === 0) {
    pipelineDebugStep(debug, "ai_jd_extract", {
      status: "skipped",
      detail: "Cache hit or deterministic-only JD",
    });
  }

  const readinessBefore = brief.readiness.total;
  const companyName = await resolveJobCompanyName(input.jobEntryId, input.companyName);
  const fullJd = hasFullJd(input.jobDescription);
  const willAttemptAi = allowAi && Boolean(aiUpgrade?.aiAllowed && aiUpgrade?.route);

  let baseline;
  try {
    pipelineDebugAdvance(debug, "baseline", "ai_gates");
    baseline = applyBaselineEnhance(input.form, brief, traceId, userId, {
      mode: willAttemptAi ? "skills_only" : "full",
    });
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

  pipelineDebugStep(debug, "baseline", {
    status: "done",
    detail: baseline.enhanceSummary,
    meta: {
      baselineMode: willAttemptAi ? "skills_only" : "full",
      skillsAdded: baseline.changes.skillsAdded.length,
      bulletsRewritten: baseline.changes.bulletsRewritten,
      bulletsWoven: baseline.changes.bulletsWoven,
      summaryRewritten: baseline.changes.summaryRewritten,
    },
    artifacts: [
      ...formDeltaArtifacts("Baseline form delta", input.form, baseline.form),
      dataArtifact("Baseline changes", baseline.changes, "output"),
    ],
  });

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
  let baselineForMeta = baseline;
  let aiAttempted = false;
  let aiSucceeded = false;
  let warning: string | undefined;
  const coherenceWarnings = [...baseline.coherenceWarnings];
  let aiBlockCode: EnhanceOffReason | "parse_fail" | "timeout" | "provider_error" | undefined;
  let engineMode: "ai" | "deterministic" = "deterministic";
  let aiMode: AiQuotaMode = "system";
  let tokensUsed = 0;
  let enhanceApiCallCount = 0;
  let apiCallCount = 0;
  let modelId = "deterministic";
  let estimatedCost = 0;

  if (willAttemptAi && aiUpgrade?.route) {
    if (aiUpgrade.aiAllowed && aiUpgrade.route) {
      aiAttempted = true;
      aiMode = aiUpgrade.route.mode;
      const pricingMap = await getAppConfig("ai_pricing_map");
      const estimatedCalls = SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS;

      logEnhance("server", "pipeline.ai.start", {
        traceId,
        userId,
        step: ENHANCE_PIPELINE.AI_UPGRADE_START,
        estimatedCalls,
      });

      pipelineDebugAdvance(debug, "ai_pass1", "baseline", {
        detail: "Starting max-ATS AI generation",
        meta: {
          routeMode: aiUpgrade.route.mode,
          modelId: aiUpgrade.route.modelId,
        },
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
          companyName,
          hasFullJd: fullJd,
          pipelineDebug: debug ?? undefined,
        },
        pricingMap,
      );

      if (result.ok) {
        aiSucceeded = true;
        finalForm = result.form;
        engineMode = "ai";
        estimatedCost = result.estimatedCost;
        tokensUsed = result.tokensUsed;
        enhanceApiCallCount = result.apiCallCount;
        apiCallCount = result.apiCallCount + brief.jdAiCallCount;
        modelId = result.modelId;
        pipelineDebugStep(debug, "ai_pass1", {
          status: "done",
          detail: `Max-ATS complete — ${result.modelId}`,
          meta: { tokensUsed: result.tokensUsed, apiCallCount: result.apiCallCount },
        });
        pipelineDebugStep(debug, "ai_pass2", {
          status: "skipped",
          detail: "Single-pass max-ATS mode",
        });

        finalForm = {
          ...finalForm,
          experience: normalizeExperienceDateFields(finalForm.experience ?? []),
        };
        const summaryGrounded = postProcessSummaryOutput(
          finalForm.professionalSummary ?? "",
          {
            identity: brief.summaryIdentity,
            experienceBlob: experienceBlobFromForm(finalForm.experience ?? []),
            employerNames: (finalForm.experience ?? [])
              .map((e) => e.company?.trim())
              .filter(Boolean) as string[],
          },
        );
        finalForm = { ...finalForm, professionalSummary: summaryGrounded.summary };
        coherenceWarnings.push(...summaryGrounded.warnings);

        logEnhance("server", "pipeline.ai.success", {
          traceId,
          userId,
          step: ENHANCE_PIPELINE.AI_UPGRADE_SUCCESS,
          tokensUsed,
          apiCallCount,
        });
      } else {
        aiBlockCode = (result.code ?? "provider_error") as typeof aiBlockCode;
        const fallback = applyBaselineEnhance(input.form, brief, traceId, userId, {
          mode: "full",
        });
        finalForm = fallback.form;
        baselineForMeta = fallback;
        warning = resolveDeterministicFallbackWarning();
        coherenceWarnings.push(...fallback.coherenceWarnings);
        pipelineDebugStep(debug, "ai_pass1", {
          status: "warning",
          detail: "AI unavailable — full deterministic baseline applied",
          meta: { code: result.code ?? null },
        });
        pipelineDebugStep(debug, "ai_pass2", {
          status: "skipped",
          detail: "AI failed before optimize",
        });
        logEnhance("server", "pipeline.ai.fail", {
          traceId,
          userId,
          step: ENHANCE_PIPELINE.AI_UPGRADE_FAIL,
          code: result.code,
          fallback: "full_baseline",
        });
        logEnhanceDiag({
          traceId,
          designStep: "13",
          track: "engine",
          pipelineStep: ENHANCE_PIPELINE.AI_UPGRADE_FAIL,
          phase: "fail",
          level: "high",
          event: "pipeline.ai.fail",
          scope: "server",
          userId,
          errorCode: aiBlockCode ?? "provider_error",
          errorMessage: result.error,
          flags: {
            routeMode: aiUpgrade.route.mode,
            provider: aiUpgrade.route.mode === "customer" ? aiUpgrade.route.provider : "system",
            deterministicFallback: true,
          },
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
  const trimmedJd = input.jobDescription?.trim() ?? "";
  const readinessAfter = computeResumeReadiness(
    refineryFormToPrimeResume(finalForm),
    input.targetRole,
    trimmedJd,
    brief.jd?.intelligence,
    brief.platform.id,
  ).total;
  const readinessDelta = {
    before: readinessBefore,
    after: readinessAfter,
  };

  pipelineDebugStep(debug, "post_process", {
    status: "done",
    detail: `Changed sections: ${changedSections.join(", ") || "none"}`,
    meta: { engineMode, aiSucceeded, changedSections, readinessDelta },
    artifacts: [
      ...formDeltaArtifacts("Final form delta", input.form, finalForm),
      dataArtifact("Readiness delta", readinessDelta, "output"),
    ],
  });

  logEnhanceDiag({
    traceId,
    designStep: "15",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.POST_PIPELINE_STATE,
    phase: "done",
    level: "low",
    event: "enhance.strategy.impact",
    scope: "server",
    userId,
    params: {
      atsPlatform: brief.platform.id,
      atsStrategy: brief.platform.strategy,
      readinessDelta: readinessAfter - readinessBefore,
      readinessBefore,
      readinessAfter,
      changedSections,
      engineMode,
      aiSucceeded,
    },
  });

  const { quotaRow, resetPatch } = resolveQuotaRowWithReset(user);
  const quotaCallCount = enhanceApiCallCount + brief.jdAiCallCount;
  const shouldIncrementQuota = aiSucceeded || brief.jdAiCallCount > 0;

  if (shouldIncrementQuota) {
    const increment = incrementQuotaPatch(quotaRow, aiEngine, {
      isEnhancement: aiSucceeded,
      callCount: quotaCallCount,
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

  const incrementForSnapshot = shouldIncrementQuota
    ? incrementQuotaPatch(quotaRow, aiEngine, {
        isEnhancement: aiSucceeded,
        callCount: quotaCallCount,
        mode: aiMode,
      })
    : { aiEnhancementsToday: quotaRow.aiEnhancementsToday, aiCallsToday: quotaRow.aiCallsToday };

  const quotaSnapshot = buildQuotaSnapshot(
    { ...quotaRow, ...incrementForSnapshot },
    aiEngine,
    aiMode,
  );

  const enhanceSummary = baselineForMeta.enhanceSummary;

  const uniqueCoherenceWarnings = [...new Set(coherenceWarnings)];
  if (uniqueCoherenceWarnings.length > 0) {
    const note = uniqueCoherenceWarnings.join(" ");
    warning = warning ? `${warning} ${note}` : note;
  }

  const sessionMeta: EnhanceSessionMeta = {
    traceId,
    engineMode,
    aiAttempted,
    aiSucceeded,
    warning,
    aiBlockCode,
    enhanceSummary,
    coverageBefore: brief.jd?.coverageBefore,
    coverageAfter: baselineForMeta.coverageAfter,
    skillsGaps: baselineForMeta.coverageAfter?.gaps.map((g) => g.atom.label),
    readinessDelta,
    coherenceWarnings: uniqueCoherenceWarnings.length > 0 ? uniqueCoherenceWarnings : undefined,
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

  logEnhanceDiag({
    traceId,
    designStep: "15",
    track: "resume",
    pipelineStep: ENHANCE_PIPELINE.SERVER_SUCCESS,
    phase: "done",
    level: "high",
    event: "pipeline.complete",
    scope: "server",
    userId,
    surface: input.surface,
    flags: {
      engineMode,
      aiAttempted,
      aiSucceeded,
      aiBlockCode: aiBlockCode ?? null,
    },
    params: {
      changedSections,
      apiCallCount,
      tokensUsed,
      readinessDelta,
    },
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
    coverageAfter: baselineForMeta.coverageAfter,
    readinessDelta,
    quota: {
      enhancementsUsed: quotaSnapshot.enhancementsUsed,
      enhancementsLimit: quotaSnapshot.enhancementsLimit,
      callsUsed: quotaSnapshot.callsUsed,
      callsLimit: quotaSnapshot.callsLimit,
    },
    aiMode,
    enhanceSummary,
    traceId,
    sessionMeta,
    skillsAdded: baselineForMeta.changes.skillsAdded,
    ...(uniqueCoherenceWarnings.length > 0
      ? { coherenceWarnings: uniqueCoherenceWarnings }
      : {}),
    ...(input.surface === "onboarding" || !allowAi ? { aiDisabled: true } : {}),
  };
}
