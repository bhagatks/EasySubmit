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
import { getAiReadinessForUser } from "@/lib/ai/ai-readiness-gate-for-user";
import type { AiReadinessErrorCode } from "@/lib/ai/ai-readiness-gate-for-user";
import { SYSTEM_QUOTA_USER_SELECT } from "@/lib/ai/system-quota-gate-for-user";
import {
  resolveQuotaRowWithReset,
  SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS,
} from "@/src/lib/ai/engine/system-quota-gate";
import { checkAiQuota, incrementQuotaPatch, type QuotaCheckResult } from "@/src/lib/ai/engine/quota";
import {
  resolveAiRoute,
  SYSTEM_POOL_EXHAUSTED_BYOK_BODY,
  SYSTEM_POOL_EXHAUSTED_HEADLINE,
  SYSTEM_POOL_EXHAUSTED_NO_BYOK_BODY,
} from "@/src/lib/ai/engine/router";
import { runCoverLetterEnhance } from "@/src/lib/ai/engine/run-cover-letter-enhance";
import { isCustomerQuotaUnlimited } from "@/src/lib/services/ai-engine-config";
import { getAppConfig } from "@/src/lib/services/config-service";
import { getFeatureFlags, isSystemAiEnabled } from "@/src/lib/services/feature-flags-service";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";

export type EnhanceCoverLetterInput = {
  form: HubRefineryForm;
  targetTitle: string;
  company: string | null;
  jobTitle: string;
  jobDescription?: string | null;
  existing?: string | null;
  forceSystem?: boolean;
  useCustomerKey?: boolean;
  traceId?: string;
  variant?: "dashboard" | "pipeline";
};

export type EnhanceCoverLetterSuccess = {
  success: true;
  body: string;
  aiMode: "customer" | "system";
  engineMode?: "ai" | "deterministic";
  fallbackSummary?: string;
};

export type EnhanceCoverLetterFailure = {
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
    | "parse_failed"
    | "capacity_exhausted"
    | "feature_disabled";
};

export type EnhanceCoverLetterResult = EnhanceCoverLetterSuccess | EnhanceCoverLetterFailure;

function mapReadinessFailureCode(
  code: AiReadinessErrorCode,
  systemQuotaCode: "quota_enhancement" | "quota_calls" | null,
): NonNullable<EnhanceCoverLetterFailure["code"]> {
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
      select: SYSTEM_QUOTA_USER_SELECT,
    }),
    getAppConfig("aiEngine"),
    getFeatureFlags(),
  ]);

  if (!user) {
    return { success: false, error: "Account not found.", code: "unauthorized" };
  }

  const variant = input.variant ?? "dashboard";
  const enhanceEnabled = featureFlags.enhanceWithAiResumeProfile;

  if (!enhanceEnabled) {
    return {
      success: false,
      error: "Enhance with AI is not available right now.",
      code: "feature_disabled",
    };
  }

  const preference = (user.aiSourcePreference ?? "auto") as AiSourcePreference;
  if (!isAiGloballyEnabled() || preference === "disabled") {
    return {
      success: false,
      error: "Enable AI in Settings to generate a cover letter with AI.",
      code: "feature_disabled",
    };
  }

  const readiness = await getAiReadinessForUser(userId, {
    forceSystem: input.forceSystem ?? false,
    estimatedCalls: SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS,
  });

  if (!readiness.status.ok) {
    return {
      success: false,
      error: readiness.status.message,
      code: mapReadinessFailureCode(readiness.status.code, readiness.systemQuota.code),
    };
  }

  const { quotaRow, resetPatch } = resolveQuotaRowWithReset(user);

  logEnhance("server", "cover.action.quota.before", {
    traceId,
    quota: summarizeQuotaForLog(quotaRow),
    userId,
  });

  const route = await resolveAiRoute({
    userId,
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    forceSystem: input.forceSystem ?? false,
    allowByokFallback: input.useCustomerKey ?? false,
    aiEngine,
    userSystemAiEnabled: user.systemAiEnabled,
  });

  if ("error" in route) {
    if (route.error === "ai_globally_disabled" || route.error === "ai_disabled") {
      return {
        success: false,
        error: "Enable AI in Settings to generate a cover letter with AI.",
        code: "feature_disabled",
      };
    }
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
      error: "Add your API key in AI Keys to use Enhance with AI.",
      code: "no_customer_key",
    };
  }

  if (route.mode === "customer" && !isCustomerQuotaUnlimited(aiEngine)) {
    const quotaCheck = checkAiQuota(quotaRow, aiEngine, "customer", {
      isEnhancement: true,
      estimatedCalls: SYSTEM_QUOTA_DEFAULT_ESTIMATED_CALLS,
    });

    if (!quotaCheck.ok) {
      return {
        success: false,
        error: customerQuotaBlockedMessage(quotaCheck),
        code:
          quotaCheck.reason === "enhancement_limit" ? "quota_enhancement" : "quota_calls",
      };
    }
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
        modelId: result.modelId,
        tokensUsed: result.tokensUsed,
        estimatedCost: 0,
      });
    }
  } else if (resetPatch) {
    await prisma.user.update({
      where: { id: userId },
      data: resetPatch,
    });
  }

  logEnhance("server", "cover.action.success", {
    traceId,
    step: ENHANCE_PIPELINE.SERVER_ENGINE,
    userId,
    aiMode: route.mode,
    bodyChars: result.body.length,
    engineMode: usedFallback ? "deterministic" : "ai",
  });

  return {
    success: true,
    body: result.body,
    aiMode: route.mode,
    engineMode: usedFallback ? "deterministic" : "ai",
    ...(usedFallback
      ? {
          fallbackSummary: result.fallbackSummary,
        }
      : {}),
  };
}
