import { recordUsageLogForUser } from "@/app/actions/ai/usage-log";
import type { HubRefineryForm } from "@/lib/onboarding/hubResume";
import { prisma } from "@/lib/prisma";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import {
  logEnhance,
  sanitizeRouteForLog,
  summarizeQuotaForLog,
} from "@/src/lib/ai/engine/enhance-logger";
import { ENHANCE_PIPELINE } from "@/src/lib/ai/engine/enhance-pipeline";
import {
  checkAiQuota,
  incrementQuotaPatch,
  quotaResetPatchIfNeeded,
  type AiQuotaMode,
  type QuotaCheckResult,
} from "@/src/lib/ai/engine/quota";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import { runCoverLetterEnhance } from "@/src/lib/ai/engine/run-cover-letter-enhance";
import { getAppConfig } from "@/src/lib/services/config-service";
import { getFeatureFlags } from "@/src/lib/services/feature-flags-service";

export type EnhanceCoverLetterInput = {
  form: HubRefineryForm;
  targetTitle: string;
  company: string | null;
  jobTitle: string;
  jobDescription?: string | null;
  existing?: string | null;
  forceSystem?: boolean;
  traceId?: string;
  variant?: "dashboard" | "pipeline";
};

export type EnhanceCoverLetterSuccess = {
  success: true;
  body: string;
  aiMode: "customer" | "system";
};

export type EnhanceCoverLetterFailure = {
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

export type EnhanceCoverLetterResult = EnhanceCoverLetterSuccess | EnhanceCoverLetterFailure;

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

export async function enhanceCoverLetterForUserId(
  userId: string,
  input: EnhanceCoverLetterInput,
): Promise<EnhanceCoverLetterResult> {
  const traceId = input.traceId ?? "no-trace";

  logEnhance("server", "cover.action.start", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ACTION_START,
    userId,
    jobTitle: input.jobTitle,
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
    return { success: false, error: "Account not found.", code: "unauthorized" };
  }

  const variant = input.variant ?? "dashboard";
  const enhanceEnabled =
    variant === "pipeline"
      ? featureFlags.extensionAutoApply
      : featureFlags.enhanceWithAiResumeProfile;

  if (!enhanceEnabled) {
    return {
      success: false,
      error: "Enhance with AI is not available right now.",
      code: "feature_disabled",
    };
  }

  const resetPatch = quotaResetPatchIfNeeded(user);
  const quotaRow = resetPatch ? { ...user, ...resetPatch } : user;

  logEnhance("server", "cover.action.quota.before", {
    traceId,
    quota: summarizeQuotaForLog(quotaRow),
    userId,
  });

  const preference = (user.aiSourcePreference || "auto") as AiSourcePreference;
  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem: input.forceSystem ?? false,
    aiEngine,
  });

  if ("error" in route) {
    if (route.error === "no_system_key") {
      return {
        success: false,
        error: "EasySubmit AI is not configured. Add your own API key in AI Keys.",
        code: "no_system_key",
      };
    }
    return {
      success: false,
      error: "Add your API key in AI Keys to use Enhance with AI.",
      code: "no_customer_key",
    };
  }

  const quotaMode: AiQuotaMode = route.mode;
  const quotaCheck = checkAiQuota(quotaRow, aiEngine, quotaMode, {
    isEnhancement: true,
    estimatedCalls: 1,
  });

  if (!quotaCheck.ok) {
    return {
      success: false,
      error: quotaBlockedMessage(quotaCheck, quotaMode),
      code:
        quotaCheck.reason === "enhancement_limit" ? "quota_enhancement" : "quota_calls",
    };
  }

  const pricingMap = await getAppConfig("ai_pricing_map");
  const result = await runCoverLetterEnhance({
    form: input.form,
    targetTitle: input.targetTitle,
    company: input.company,
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
    existing: input.existing,
    route,
    traceId,
    userId,
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.error,
      code: result.code ?? "provider_error",
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

  if (result.tokensUsed > 0) {
    await recordUsageLogForUser(userId, {
      modelId: result.modelId,
      tokensUsed: result.tokensUsed,
      estimatedCost: 0,
    });
  }

  logEnhance("server", "cover.action.success", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ENGINE,
    userId,
    aiMode: route.mode,
    bodyChars: result.body.length,
  });

  return {
    success: true,
    body: result.body,
    aiMode: route.mode,
  };
}
