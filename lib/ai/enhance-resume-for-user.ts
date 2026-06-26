import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { analyzeJobIntelligenceWithOnet } from "@/lib/job-tracker/ats/job-intelligence";
import { prisma } from "@/lib/prisma";
import { analyzeJobDescription, hashJobDescription } from "@/lib/job-tracker/jd/jd-brain";
import { buildResumeEnhanceDirective } from "@/lib/job-tracker/jd/jd-directive";
import { refineryFormToPrimeResume } from "@/lib/onboarding/hubResume";
import type { JDIntelligence } from "@/lib/job-tracker/jd/jd-intelligence";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import {
  logEnhance,
  sanitizeRouteForLog,
  summarizeEnhanceRequest,
  summarizeEnhanceResult,
  summarizeFormDelta,
  summarizeQuotaForLog,
} from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import {
  buildQuotaSnapshot,
  checkAiQuota,
  incrementQuotaPatch,
  type AiQuotaMode,
  type QuotaCheckResult,
} from "@/src/lib/ai/engine/quota";
import { resolveAiRoute, SYSTEM_POOL_EXHAUSTED_BYOK_BODY, SYSTEM_POOL_EXHAUSTED_HEADLINE, SYSTEM_POOL_EXHAUSTED_NO_BYOK_BODY } from "@/src/lib/ai/engine/router";
import { runResumeEnhance } from "@/src/lib/ai/engine/run-enhance";
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import type { AiReadinessErrorCode } from "@/lib/ai/ai-readiness-gate-for-user";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
import {
  resolveQuotaRowWithReset,
  SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS,
  SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS,
} from "@/src/lib/ai/engine/system-quota-gate";
import { getAppConfig } from "@/src/lib/services/config-service";
import { isCustomerQuotaUnlimited } from "@/src/lib/services/ai-engine-config";
import { isSubscribed } from "@/src/lib/services/config-service";
import {
  getFeatureFlags,
  isSystemAiEnabled,
} from "@/src/lib/services/feature-flags-service";

export type EnhanceResumeProfileInput = {
  profileId?: string;
  /** Job tracker entry ID — used to load/persist JD intelligence cache. */
  jobEntryId?: string;
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  rawResumeText?: string | null;
  forceSystem?: boolean;
  /** User opted in to BYOK for this request (shared pool unavailable). */
  useCustomerKey?: boolean;
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
  partialEnhance?: boolean;
  warning?: string;
  /** True when AI failed and the deterministic fallback engine ran instead. */
  fallbackUsed?: boolean;
  fallbackSummary?: string;
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

function mapReadinessFailureCode(
  code: AiReadinessErrorCode,
  systemQuotaCode: "quota_enhancement" | "quota_calls" | null,
): NonNullable<EnhanceResumeProfileFailure["code"]> {
  if (code === "quota_exhausted") {
    return systemQuotaCode ?? "quota_enhancement";
  }
  if (code === "key_missing") {
    return "no_customer_key";
  }
  return "provider_error";
}

function customerQuotaBlockedMessage(
  check: Extract<QuotaCheckResult, { ok: false }>,
): string {
  const { snapshot } = check;
  if (check.reason === "enhancement_limit") {
    return `Daily enhancement limit reached (${snapshot.enhancementsLimit}/day). Try again tomorrow.`;
  }
  return `Daily AI call limit reached (${snapshot.callsLimit}/day). Try again tomorrow.`;
}

/** Bearer-safe Enhance — used by extension pipeline (no NextAuth session). */
export async function enhanceResumeForUserId(
  userId: string,
  input: EnhanceResumeProfileInput,
): Promise<EnhanceResumeProfileResult> {
  const startedAt = Date.now();
  const traceId = input.traceId ?? "no-trace";

  logEnhance("server", "action.start", {
    ...summarizeEnhanceRequest(input),
    step: ENHANCE_PIPELINE.SERVER_ACTION_START,
    traceId,
    userId,
  });

  const [user, aiEngine, featureFlags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: SYSTEM_QUOTA_USER_SELECT,
    }),
    getAppConfig("aiEngine"),
    getFeatureFlags(),
  ]);

  if (!user) {
    logEnhance("server", "action.denied", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      reason: "user_not_found",
      userId,
    });
    return { success: false, error: "Account not found.", code: "unauthorized" };
  }

  const variant = input.variant ?? "dashboard";
  const enhanceEnabled =
    variant === "onboarding"
      ? featureFlags.enhanceWithAiOnboarding
      : featureFlags.enhanceWithAiResumeProfile;

  if (!enhanceEnabled) {
    logEnhance("server", "action.denied", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      reason: "feature_disabled",
      variant,
      userId,
    });
    return {
      success: false,
      error: "Enhance with AI is not available right now.",
      code: "feature_disabled",
    };
  }

  const estimatedCalls = input.jobDescription?.trim()
    ? SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS
    : SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS;

  const readiness = await getAiReadinessForUser(userId, {
    forceSystem: input.forceSystem ?? false,
    estimatedCalls,
  });

  if (!readiness.status.ok) {
    logEnhance("server", "action.readiness.blocked", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      reason: readiness.reason,
      code: readiness.status.code,
      userId,
    });
    return {
      success: false,
      error: readiness.status.message,
      code: mapReadinessFailureCode(
        readiness.status.code,
        readiness.systemQuota.code,
      ),
    };
  }

  const { quotaRow, resetPatch } = resolveQuotaRowWithReset(user);

  logEnhance("server", "action.quota.before", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_QUOTA,
    preference: user.aiSourcePreference || "auto",
    vaultKeyPresent: Boolean(user.vaultKeyId),
    activeProvider: user.activeProvider,
    quota: summarizeQuotaForLog(quotaRow),
    quotaResetApplied: Boolean(resetPatch),
    userId,
  });

  const preference = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem: input.forceSystem ?? false,
    allowByokFallback: input.useCustomerKey ?? false,
    aiEngine,
    systemAiEnabled: featureFlags.systemAiEnabled,
  });

  logEnhance("server", "action.route", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ROUTE,
    route: sanitizeRouteForLog(route),
    userId,
  });

  if ("error" in route) {
    logEnhance("server", "action.route.error", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      code: route.error,
      userId,
    });
    if (route.error === "no_system_key") {
      return {
        success: false,
        error: "EasySubmit AI is not configured. Add your own API key in AI Keys.",
        code: "no_system_key",
      };
    }
    if (route.error === "system_pool_exhausted") {
      return {
        success: false,
        code: "system_pool_exhausted",
        byokAvailable: route.byokAvailable,
        error: route.byokAvailable
          ? `${SYSTEM_POOL_EXHAUSTED_HEADLINE} ${SYSTEM_POOL_EXHAUSTED_BYOK_BODY}`
          : `${SYSTEM_POOL_EXHAUSTED_HEADLINE} ${SYSTEM_POOL_EXHAUSTED_NO_BYOK_BODY}`,
      };
    }
    return {
      success: false,
      error: isSystemAiEnabled(featureFlags)
        ? "Add an API key in AI Keys or switch to EasySubmit AI in Settings."
        : "Add an API key in AI Keys to use Enhance with AI.",
      code: "no_customer_key",
    };
  }

  const quotaMode: AiQuotaMode = route.mode;
  const userIsSubscribed = isSubscribed(user.plan ?? "free", user.subscriptionStatus ?? null);

  if (route.mode === "customer" && !userIsSubscribed && !isCustomerQuotaUnlimited(aiEngine)) {
    const quotaCheck = checkAiQuota(quotaRow, aiEngine, quotaMode, {
      isEnhancement: true,
      estimatedCalls,
    });

    if (!quotaCheck.ok) {
      logEnhance("server", "action.quota.blocked", {
        traceId,
        step: ENHANCE_PIPELINE.SERVER_FAIL,
        reason: quotaCheck.reason,
        quotaMode,
        userId,
      });
      return {
        success: false,
        error: customerQuotaBlockedMessage(quotaCheck),
        code:
          quotaCheck.reason === "enhancement_limit" ? "quota_enhancement" : "quota_calls",
      };
    }
  }

  // Pre-compute ATS intelligence — feeds tactical prompts and deterministic fallback.
  // Only when a job description is present (no JD = general enhance, no targeting possible).
  const jobIntelligence = input.jobDescription?.trim()
    ? await analyzeJobIntelligenceWithOnet(input.form, input.targetRole, input.jobDescription)
    : undefined;

  if (jobIntelligence) {
    logEnhance("server", "action.intelligence", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_JD_INTELLIGENCE,
      userId,
      missingKeywords: jobIntelligence.missingKeywords.length,
      skillsToAdd: jobIntelligence.skillsToAdd,
      skillsToAddCount: jobIntelligence.skillsToAdd.length,
      keywordsForContentCount: jobIntelligence.keywordsForContent.length,
      weakBulletsCount: jobIntelligence.weakBullets.length,
      coveragePercent: jobIntelligence.coveragePercent,
      onetMatchedTitle: jobIntelligence.onetMatchedTitle ?? null,
    });
  }

  // JD Brain — load cached intelligence or run full analysis, then build directive.
  let enhanceDirective: import("@/lib/job-tracker/jd/jd-intelligence").ResumeEnhanceDirective | undefined;
  if (input.jobDescription?.trim()) {
    let cachedIntel: JDIntelligence | null = null;
    let cachedHash: string | null = null;

    if (input.jobEntryId) {
      const entry = await prisma.jobTrackerEntry.findUnique({
        where: { id: input.jobEntryId },
        select: { jdIntelligence: true, jdDescriptionHash: true },
      });
      cachedIntel = entry?.jdIntelligence as JDIntelligence | null ?? null;
      cachedHash = entry?.jdDescriptionHash ?? null;
    }

    const jdResult = await analyzeJobDescription({
      rawDescription: input.jobDescription,
      targetRole: input.targetRole,
      cachedIntelligence: cachedIntel,
      cachedHash,
    });

    // Persist updated intelligence back to DB (non-blocking)
    if (input.jobEntryId && !jdResult.cacheHit) {
      prisma.jobTrackerEntry
        .update({
          where: { id: input.jobEntryId },
          data: {
            jdIntelligence: jdResult.intelligence as object,
            jdDescriptionHash: jdResult.descriptionHash,
            jdIntelUpdatedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }

    const primeData = refineryFormToPrimeResume(input.form);
    enhanceDirective = buildResumeEnhanceDirective(
      jdResult.intelligence,
      primeData.skills ?? [],
    );

    logEnhance("server", "action.directive", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_JD_DIRECTIVE,
      userId,
      cacheHit: jdResult.cacheHit,
      extractedJobTitle: jdResult.intelligence.extractedJobTitle ?? null,
      mustAddSkillsCount: enhanceDirective.mustAddSkills.length,
      mustAddSkills: enhanceDirective.mustAddSkills.slice(0, 12),
      mustWeaveKeywordsCount: enhanceDirective.mustWeaveKeywords.length,
      summaryTheme: enhanceDirective.summaryTheme ?? null,
      roleLevel: enhanceDirective.roleLevel,
    });
  }

  const pricingMap = await getAppConfig("ai_pricing_map");
  const engineStartedAt = Date.now();
  const result = await runResumeEnhance(
    {
      form: input.form,
      targetRole: input.targetRole,
      jobDescription: input.jobDescription,
      rawResumeText: input.rawResumeText,
      route,
      traceId,
      userId,
      jobIntelligence,
      enhanceDirective,
    },
    pricingMap,
  );

  logEnhance("server", "action.engine.result", {
    traceId,
    step: result.ok ? ENHANCE_PIPELINE.ENGINE_MERGE : ENHANCE_PIPELINE.ENGINE_ERROR,
    ok: result.ok,
    durationMs: Date.now() - engineStartedAt,
    userId,
    ...(result.ok
      ? {
          modelId: result.modelId,
          tokensUsed: result.tokensUsed,
          apiCallCount: result.apiCallCount,
          changedSections: result.changedSections,
          fallbackUsed: result.fallbackUsed ?? false,
          partialEnhance: result.partialEnhance ?? false,
          delta: summarizeFormDelta(input.form, result.form),
        }
      : { code: result.code, error: result.error }),
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.error,
      code:
        result.code === "rate_limited" ||
        result.code === "insufficient_quota" ||
        result.code === "invalid_response" ||
        result.code === "capacity_exhausted"
          ? result.code
          : "provider_error",
    };
  }

  // Only increment quota when AI actually ran (not deterministic fallback)
  const usedFallback = Boolean(result.fallbackUsed);

  if (!usedFallback) {
    const increment = incrementQuotaPatch(quotaRow, aiEngine, {
      isEnhancement: true,
      callCount: result.apiCallCount,
      mode: route.mode,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(resetPatch ?? {}),
        ...increment,
      },
    });

    if (result.tokensUsed > 0) {
      await recordUsageLogForUser(userId, {
        tokensUsed: result.tokensUsed,
        modelId: result.modelId,
        estimatedCost: result.estimatedCost,
      });
    }
  } else if (resetPatch) {
    // Still apply the quota reset even if fallback ran
    await prisma.user.update({ where: { id: userId }, data: resetPatch });
  }

  const incrementForSnapshot = usedFallback
    ? { aiEnhancementsToday: quotaRow.aiEnhancementsToday, aiCallsToday: quotaRow.aiCallsToday }
    : incrementQuotaPatch(quotaRow, aiEngine, {
        isEnhancement: true,
        callCount: result.apiCallCount,
        mode: route.mode,
      });

  const updatedSnapshot = buildQuotaSnapshot(
    { ...quotaRow, ...incrementForSnapshot },
    aiEngine,
    route.mode,
  );

  const response = {
    success: true as const,
    form: result.form,
    changedSections: result.changedSections,
    targetRole: result.targetRole,
    quota: {
      enhancementsUsed: updatedSnapshot.enhancementsUsed,
      enhancementsLimit: updatedSnapshot.enhancementsLimit,
      callsUsed: updatedSnapshot.callsUsed,
      callsLimit: updatedSnapshot.callsLimit,
    },
    aiMode: route.mode,
    ...(result.partialEnhance
      ? {
          partialEnhance: true,
          warning:
            result.partialEnhanceMessage ??
            "Job-specific optimization was incomplete. Your base enhancement was saved.",
        }
      : {}),
    ...(usedFallback
      ? {
          fallbackUsed: true,
          fallbackSummary: result.fallbackSummary,
        }
      : {}),
  };

  logEnhance("server", "action.success", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_SUCCESS,
    userId,
    ...summarizeEnhanceResult({
      changedSections: result.changedSections,
      aiMode: route.mode,
      quota: response.quota,
      tokensUsed: result.tokensUsed,
      modelId: result.modelId,
      apiCallCount: result.apiCallCount,
      estimatedCost: result.estimatedCost,
      durationMs: Date.now() - startedAt,
    }),
  });

  return response;
}
