"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import { getAppConfig } from "@/src/lib/services/config-service";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import type { StudioEditorSectionId } from "@/lib/resume/studio-editor-sections";
import {
  buildQuotaSnapshot,
  checkAiQuota,
  incrementQuotaPatch,
  quotaResetPatchIfNeeded,
  type AiQuotaMode,
} from "@/src/lib/ai/engine/quota";
import { isSystemAiEnabled, isCustomerQuotaUnlimited } from "@/src/lib/services/ai-engine-config";
import { resolveAiRoute, resolveEffectiveAiSource } from "@/src/lib/ai/engine/router";
import { runResumeEnhance } from "@/src/lib/ai/engine/run-enhance";
import {
  logEnhance,
  sanitizeRouteForLog,
  summarizeEnhanceRequest,
  summarizeEnhanceResult,
  summarizeQuotaForLog,
} from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import type { QuotaCheckResult } from "@/src/lib/ai/engine/quota";

function quotaBlockedMessage(
  check: Extract<QuotaCheckResult, { ok: false }>,
  mode: AiQuotaMode,
): string {
  const { snapshot } = check;
  if (check.reason === "enhancement_limit") {
    if (mode === "system") {
      return `Daily enhancement limit reached (${snapshot.enhancementsLimit}/day). Add your API key for more.`;
    }
    return `Daily enhancement limit reached (${snapshot.enhancementsLimit}/day). Try again tomorrow.`;
  }
  if (mode === "system") {
    return `Daily AI call limit reached (${snapshot.callsLimit}/day). Add your API key or try again tomorrow.`;
  }
  return `Daily AI call limit reached (${snapshot.callsLimit}/day). Try again tomorrow.`;
}

export type EnhanceResumeProfileInput = {
  profileId?: string;
  form: HubRefineryForm;
  targetRole: string;
  jobDescription?: string;
  rawResumeText?: string | null;
  /** Onboarding always uses system AI. */
  forceSystem?: boolean;
  /** Correlate client + server logs (from createEnhanceTraceId). */
  traceId?: string;
  variant?: "dashboard" | "onboarding";
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
};

export type EnhanceResumeProfileFailure = {
  success: false;
  error: string;
  code?:
    | "unauthorized"
    | "quota_enhancement"
    | "quota_calls"
    | "no_system_key"
    | "no_customer_key"
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

export type EnhancePreflightInput = {
  variant?: "dashboard" | "onboarding";
  forceSystem?: boolean;
};

export type EnhancePreflightSuccess = {
  ok: true;
  systemAiEnabled: boolean;
};

export type EnhancePreflightFailure = {
  ok: false;
  error: string;
  code: NonNullable<EnhanceResumeProfileFailure["code"]>;
  /** When true, hide "Switch to EasySubmit AI" — BYOK is required. */
  requiresByokOnly?: boolean;
};

export type EnhancePreflightResult = EnhancePreflightSuccess | EnhancePreflightFailure;

/** Validates feature flag, routing, and quota before opening the Enhance dialog. */
export async function checkEnhanceWithAiPreflight(
  input: EnhancePreflightInput = {},
): Promise<EnhancePreflightResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { ok: false, error: "Sign in required.", code: "unauthorized" };
  }

  const variant = input.variant ?? "dashboard";
  const forceSystem = input.forceSystem ?? false;

  const [user, aiEngine, featureFlags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        vaultKeyId: true,
        activeProvider: true,
        aiSourcePreference: true,
        aiEnhancementsToday: true,
        aiCallsToday: true,
        aiQuotaResetAt: true,
      },
    }),
    getAppConfig("aiEngine"),
    getFeatureFlags(),
  ]);

  if (!user) {
    return { ok: false, error: "Account not found.", code: "unauthorized" };
  }

  const systemAiEnabled = isSystemAiEnabled(aiEngine);

  const enhanceEnabled =
    variant === "onboarding"
      ? featureFlags.enhanceWithAiOnboarding
      : featureFlags.enhanceWithAiResumeProfile;

  if (!enhanceEnabled) {
    return {
      ok: false,
      error: "Enhance with AI is not available right now.",
      code: "feature_disabled",
    };
  }

  if (!systemAiEnabled) {
    if (!user.vaultKeyId) {
      return {
        ok: false,
        error: "EasySubmit AI is off — add your API key in AI Keys to use Enhance with AI.",
        code: "no_customer_key",
        requiresByokOnly: true,
      };
    }
  }

  const resetPatch = quotaResetPatchIfNeeded(user);
  const quotaRow = resetPatch ? { ...user, ...resetPatch } : user;

  const preference = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem,
    aiEngine,
  });

  if ("error" in route) {
    if (route.error === "no_system_key") {
      return {
        ok: false,
        error: "EasySubmit AI is not configured. Add your own API key in AI Keys.",
        code: "no_system_key",
      };
    }
    return {
      ok: false,
      error: systemAiEnabled
        ? "Add an API key in AI Keys or switch to EasySubmit AI in Settings."
        : "Add an API key in AI Keys to use Enhance with AI.",
      code: "no_customer_key",
      requiresByokOnly: !systemAiEnabled,
    };
  }

  const quotaMode: AiQuotaMode = route.mode;
  const quotaCheck = checkAiQuota(quotaRow, aiEngine, quotaMode, {
    isEnhancement: true,
    estimatedCalls: 1,
  });

  if (!quotaCheck.ok) {
    return {
      ok: false,
      error: quotaBlockedMessage(quotaCheck, quotaMode),
      code:
        quotaCheck.reason === "enhancement_limit" ? "quota_enhancement" : "quota_calls",
    };
  }

  return { ok: true, systemAiEnabled };
}

export type AiQuotaSummary = {
  enhancementsUsed: number;
  enhancementsLimit: number;
  callsUsed: number;
  callsLimit: number;
  aiSourcePreference: AiSourcePreference;
  effectiveMode: "customer" | "system";
};

export async function getAiQuotaSummary(): Promise<AiQuotaSummary | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      aiSourcePreference: true,
      aiEnhancementsToday: true,
      aiCallsToday: true,
      aiQuotaResetAt: true,
      vaultKeyId: true,
    },
  });

  if (!user) return null;

  const aiEngine = await getAppConfig("aiEngine");
  const reset = quotaResetPatchIfNeeded(user);
  const row = reset ? { ...user, ...reset } : user;

  const pref = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const effectiveMode = resolveEffectiveAiSource(
    pref,
    Boolean(user.vaultKeyId),
    aiEngine,
    false,
  );

  const snapshot = buildQuotaSnapshot(row, aiEngine, effectiveMode);

  return {
    ...snapshot,
    aiSourcePreference: pref,
    effectiveMode,
  };
}

export async function enhanceResumeProfile(
  input: EnhanceResumeProfileInput,
): Promise<EnhanceResumeProfileResult> {
  const startedAt = Date.now();
  const traceId = input.traceId ?? "no-trace";

  logEnhance("server", "action.start", {
    ...summarizeEnhanceRequest(input),
    step: ENHANCE_PIPELINE.SERVER_ACTION_START,
    traceId,
  });

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    logEnhance("server", "action.denied", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      reason: "unauthorized",
    });
    return { success: false, error: "Sign in required.", code: "unauthorized" };
  }

  logEnhance("server", "action.session", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_AUTH,
    userId,
  });

  const [user, aiEngine, featureFlags] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        vaultKeyId: true,
        activeProvider: true,
        aiSourcePreference: true,
        aiEnhancementsToday: true,
        aiCallsToday: true,
        aiQuotaResetAt: true,
      },
    }),
    getAppConfig("aiEngine"),
    getFeatureFlags(),
  ]);

  if (!user) {
    logEnhance("server", "action.denied", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      reason: "user_not_found",
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
    });
    return {
      success: false,
      error: "Enhance with AI is not available right now.",
      code: "feature_disabled",
    };
  }

  const resetPatch = quotaResetPatchIfNeeded(user);
  const quotaRow = resetPatch ? { ...user, ...resetPatch } : user;

  logEnhance("server", "action.quota.before", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_QUOTA,
    preference: user.aiSourcePreference || "auto",
    vaultKeyPresent: Boolean(user.vaultKeyId),
    activeProvider: user.activeProvider,
    quota: summarizeQuotaForLog(quotaRow),
    quotaResetApplied: Boolean(resetPatch),
  });

  const preference = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem: input.forceSystem ?? false,
    aiEngine,
  });

  logEnhance("server", "action.route", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ROUTE,
    route: sanitizeRouteForLog(route),
  });

  if ("error" in route) {
    logEnhance("server", "action.route.error", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      code: route.error,
    });
    if (route.error === "no_system_key") {
      return {
        success: false,
        error: "EasySubmit AI is not configured. Add your own API key in AI Keys.",
        code: "no_system_key",
      };
    }
    return {
      success: false,
      error: isSystemAiEnabled(aiEngine)
        ? "Add an API key in AI Keys or switch to EasySubmit AI in Settings."
        : "Add an API key in AI Keys to use Enhance with AI.",
      code: "no_customer_key",
    };
  }

  const quotaMode: AiQuotaMode = route.mode;
  const estimatedCalls = input.jobDescription?.trim() ? 2 : 1;

  logEnhance("server", "action.quota.check", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_QUOTA,
    quotaMode,
    estimatedCalls,
    customerQuotaUnlimited: isCustomerQuotaUnlimited(aiEngine),
    quota: summarizeQuotaForLog(quotaRow),
    limits: buildQuotaSnapshot(quotaRow, aiEngine, quotaMode),
  });

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
    });
    return {
      success: false,
      error: quotaBlockedMessage(quotaCheck, quotaMode),
      code:
        quotaCheck.reason === "enhancement_limit" ? "quota_enhancement" : "quota_calls",
    };
  }

  const pricingMap = await getAppConfig("ai_pricing_map");
  logEnhance("server", "action.engine.invoke", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ENGINE,
    pricingMapLoaded: Boolean(pricingMap),
  });

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
    },
    pricingMap,
  );

  logEnhance("server", "action.engine.result", {
    traceId,
    step: result.ok ? ENHANCE_PIPELINE.ENGINE_MERGE : ENHANCE_PIPELINE.ENGINE_ERROR,
    ok: result.ok,
    durationMs: Date.now() - engineStartedAt,
    ...(result.ok
      ? {
          modelId: result.modelId,
          tokensUsed: result.tokensUsed,
          apiCallCount: result.apiCallCount,
          changedSections: result.changedSections,
        }
      : { code: result.code, error: result.error }),
  });

  if (!result.ok) {
    logEnhance("server", "action.failed", {
      traceId,
      step: ENHANCE_PIPELINE.SERVER_FAIL,
      code: result.code,
      error: result.error,
      durationMs: Date.now() - startedAt,
    });
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

  logEnhance("server", "action.quota.after", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_PERSIST,
    increment,
    quota: summarizeQuotaForLog({ ...quotaRow, ...increment }),
  });

  if (result.tokensUsed > 0) {
    await recordUsageLogForUser(userId, {
      tokensUsed: result.tokensUsed,
      modelId: result.modelId,
      estimatedCost: result.estimatedCost,
    });
  }

  const updatedSnapshot = buildQuotaSnapshot(
    { ...quotaRow, ...increment },
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
  };

  logEnhance("server", "action.success", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_SUCCESS,
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

export async function updateAiSourcePreference(
  preference: AiSourcePreference,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Sign in required." };
  }

  if (!["auto", "customer", "system"].includes(preference)) {
    return { success: false, error: "Invalid AI source preference." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { aiSourcePreference: preference },
  });

  return { success: true };
}
