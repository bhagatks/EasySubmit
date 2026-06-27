import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { prisma } from "@/lib/prisma";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import { resolveEnhanceFeature } from "@/lib/features/resolve-enhance";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
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
import { type ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { runResumeEnhance } from "@/src/lib/ai/engine/run-enhance";
import { buildEnhanceIntelligenceContext } from "@/lib/ai/build-enhance-intelligence-context";
import { runDeterministicResumeEnhance } from "@/lib/ai/run-deterministic-resume-enhance";
import { SYSTEM_QUOTA_USER_SELECT as _SQU } from "@/lib/ai/system-quota-gate-for-user";
import {
  resolveQuotaRowWithReset,
  SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS,
  SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS,
} from "@/src/lib/ai/engine/system-quota-gate";
import { getAppConfig } from "@/src/lib/services/config-service";
import { isCustomerQuotaUnlimited } from "@/src/lib/services/ai-engine-config";
import { isSubscribed } from "@/src/lib/services/config-service";
import type { FeatureSurface } from "@/lib/features/types";

export type EnhanceResumeProfileInput = {
  profileId?: string;
  jobEntryId?: string;
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  rawResumeText?: string | null;
  forceSystem?: boolean;
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
  engineMode: "ai" | "deterministic";
  fallbackSummary?: string;
  aiDisabled?: boolean;
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

function variantToSurface(variant: EnhanceResumeProfileInput["variant"]): FeatureSurface {
  if (variant === "onboarding") return "onboarding";
  if (variant === "pipeline") return "extension";
  return "job_apply";
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
  const surface = variantToSurface(input.variant);

  logEnhance("server", "action.start", {
    ...summarizeEnhanceRequest(input),
    step: ENHANCE_PIPELINE.SERVER_ACTION_START,
    traceId,
    userId,
    surface,
  });

  const [user, aiEngine] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: SYSTEM_QUOTA_USER_SELECT,
    }),
    getAppConfig("aiEngine"),
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

  logEnhance("server", "action.auth", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_AUTH,
    userId,
    surface,
    variant: input.variant ?? "dashboard",
  });

  // ── Gate resolution (G1–G6) via features framework ───────────────────────────
  const enhance = await resolveEnhanceFeature(user, surface, {
    forceSystem: input.forceSystem,
    useCustomerKey: input.useCustomerKey,
  });

  logEnhance("server", "action.gate", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ROUTE,
    userId,
    available: enhance.available,
    reason: enhance.reason ?? null,
    mode: enhance.mode,
  });

  if (!enhance.available) {
    // Deterministic path: globally disabled or user opted out — silent, not an error
    if (enhance.reason === "globally_disabled" || enhance.reason === "user_disabled") {
      return runDeterministicResumeEnhance({
        userId,
        user,
        enhanceInput: input,
        aiEngine,
        traceId,
        aiDisabled: enhance.reason === "user_disabled",
      });
    }

    // Hard blocks
    const codeMap: Record<string, EnhanceResumeProfileFailure["code"]> = {
      feature_disabled: "feature_disabled",
      no_key: "no_customer_key",
      pool_down: "system_pool_exhausted",
      quota_exceeded: "quota_enhancement",
    };

    return {
      success: false,
      error: enhance.reason === "feature_disabled"
        ? "Enhance with AI is not available right now."
        : enhance.reason === "no_key"
          ? "Add an API key in AI Keys to use Enhance with AI."
          : enhance.reason === "pool_down"
            ? "EasySubmit's shared AI is temporarily unavailable. Try again later."
            : "Daily enhancement limit reached. Try again tomorrow.",
      code: codeMap[enhance.reason ?? ""] ?? "provider_error",
    };
  }

  // ── Build AI route from resolved enhance state ────────────────────────────────
  const route: ResolvedAiRoute =
    enhance.mode === "customer"
      ? {
          mode: "customer",
          provider: enhance.provider as Parameters<typeof runResumeEnhance>[0]["route"] extends { mode: "customer"; provider: infer P } ? P : never,
          modelId: enhance.modelId!,
          vaultKeyId: enhance.vaultKeyId!,
        }
      : { mode: "system", modelId: enhance.modelId! };

  const quotaMode: AiQuotaMode = enhance.mode!;
  const { quotaRow, resetPatch } = resolveQuotaRowWithReset(user);
  const userIsSubscribed = isSubscribed(user.plan ?? "free", user.subscriptionStatus ?? null);

  logEnhance("server", "action.quota.before", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_QUOTA,
    quotaMode,
    vaultKeyPresent: Boolean(user.vaultKeyId),
    activeProvider: user.activeProvider,
    quota: summarizeQuotaForLog(quotaRow),
    quotaResetApplied: Boolean(resetPatch),
    userId,
  });

  // ── Pre-processing context ────────────────────────────────────────────────────
  const estimatedCalls = input.jobDescription?.trim()
    ? SYSTEM_QUOTA_PIPELINE_ESTIMATED_CALLS
    : SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS;

  const { jobIntelligence, enhanceDirective } = await buildEnhanceIntelligenceContext({
    form: input.form,
    targetRole: input.targetRole,
    jobDescription: input.jobDescription,
    jobEntryId: input.jobEntryId,
    traceId,
    userId,
  });

  // ── AI call ───────────────────────────────────────────────────────────────────
  const pricingMap = await getAppConfig("ai_pricing_map");
  const engineStartedAt = Date.now();

  logEnhance("server", "action.engine.start", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ENGINE,
    userId,
    estimatedCalls,
  });

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
          engineMode: result.fallbackUsed ? "deterministic" : "ai",
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

  const usedFallback = Boolean(result.fallbackUsed);

  // ── Quota persist + usage log ─────────────────────────────────────────────────
  if (!usedFallback) {
    const increment = incrementQuotaPatch(quotaRow, aiEngine, {
      isEnhancement: true,
      callCount: result.apiCallCount,
      mode: quotaMode,
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
    await prisma.user.update({ where: { id: userId }, data: resetPatch });
  }

  const incrementForSnapshot = usedFallback
    ? { aiEnhancementsToday: quotaRow.aiEnhancementsToday, aiCallsToday: quotaRow.aiCallsToday }
    : incrementQuotaPatch(quotaRow, aiEngine, {
        isEnhancement: true,
        callCount: result.apiCallCount,
        mode: quotaMode,
      });

  const updatedSnapshot = buildQuotaSnapshot(
    { ...quotaRow, ...incrementForSnapshot },
    aiEngine,
    quotaMode,
  );

  logEnhance("server", "action.persist.done", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_PERSIST,
    userId,
    usedFallback,
    tokensUsed: result.tokensUsed,
    estimatedCost: result.estimatedCost,
    quotaAfter: {
      enhancementsUsed: updatedSnapshot.enhancementsUsed,
      callsUsed: updatedSnapshot.callsUsed,
    },
  });

  const response: EnhanceResumeProfileSuccess = {
    success: true,
    form: result.form,
    changedSections: result.changedSections,
    targetRole: result.targetRole,
    quota: {
      enhancementsUsed: updatedSnapshot.enhancementsUsed,
      enhancementsLimit: updatedSnapshot.enhancementsLimit,
      callsUsed: updatedSnapshot.callsUsed,
      callsLimit: updatedSnapshot.callsLimit,
    },
    aiMode: quotaMode,
    ...(result.partialEnhance
      ? {
          partialEnhance: true,
          warning:
            result.partialEnhanceMessage ??
            "Job-specific optimization was incomplete. Your base enhancement was saved.",
        }
      : {}),
    engineMode: (usedFallback ? "deterministic" : "ai") as "ai" | "deterministic",
    ...(usedFallback ? { fallbackSummary: result.fallbackSummary } : {}),
  };

  logEnhance("server", "action.success", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_SUCCESS,
    userId,
    ...summarizeEnhanceResult({
      changedSections: result.changedSections,
      aiMode: quotaMode,
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
