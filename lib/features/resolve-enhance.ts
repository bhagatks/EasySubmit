import type { EnhanceOffReason, FeatureSurface } from "@/lib/features/types";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { resolveAiRoute, type ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { resolveQuotaRowWithReset } from "@/src/lib/ai/engine/system-quota-gate";
import { checkAiQuota } from "@/src/lib/ai/engine/quota";
import { getAppConfig, isSubscribed } from "@/src/lib/services/config-service";
import { getFeatureFlags, isSystemAiEnabled } from "@/src/lib/services/feature-flags-service";
import { isCustomerQuotaUnlimited } from "@/src/lib/services/ai-engine-config";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";

/** Which feature flag gates each surface. */
const SURFACE_FLAG_MAP = {
  onboarding: null,
  job_apply: "enhanceWithAiResumeProfile",
  resume: "enhanceWithAiResumeProfile",
  extension: "enhanceWithAiResumeProfile",
} as const satisfies Record<FeatureSurface, keyof Awaited<ReturnType<typeof getFeatureFlags>> | null>;

const AI_DISABLED_SURFACES: FeatureSurface[] = ["onboarding"];

export type ResolveEnhanceOpts = {
  forceSystem?: boolean;
  useCustomerKey?: boolean;
};

function softOff(
  reason: EnhanceOffReason,
): import("@/lib/features/types").EnhanceFeatureResolution {
  return {
    baselineAvailable: true,
    aiAvailable: false,
    available: false,
    reason,
    route: null,
    mode: null,
    vaultKeyId: null,
    provider: null,
    modelId: null,
    quota: { used: 0, limit: 0, unlimited: false },
    fallbackAvailable: true,
  };
}

function resolutionFromRoute(
  route: ResolvedAiRoute,
  user: SystemQuotaUserRow,
  aiEngine: AiEngineConfig,
  unlimited: boolean,
): import("@/lib/features/types").EnhanceFeatureResolution {
  return {
    baselineAvailable: true,
    aiAvailable: true,
    available: true,
    route,
    mode: route.mode,
    vaultKeyId: route.mode === "customer" ? route.vaultKeyId : null,
    provider: route.mode === "customer" ? route.provider : null,
    modelId: route.modelId,
    quota: {
      used: user.aiEnhancementsToday,
      limit: unlimited ? Infinity : aiEngine.quotas[route.mode].dailyEnhancements,
      unlimited,
    },
    fallbackAvailable: true,
  };
}

export async function resolveEnhanceFeature(
  user: SystemQuotaUserRow,
  surface: FeatureSurface,
  opts: ResolveEnhanceOpts = {},
): Promise<import("@/lib/features/types").EnhanceFeatureResolution> {
  const { quotaRow } = resolveQuotaRowWithReset(user);

  if (!isAiGloballyEnabled()) {
    return softOff("globally_disabled");
  }

  const [flags, aiEngine] = await Promise.all([
    getFeatureFlags(),
    getAppConfig("aiEngine"),
  ]);

  if (AI_DISABLED_SURFACES.includes(surface)) {
    return softOff("user_disabled");
  }

  const flagKey = SURFACE_FLAG_MAP[surface];
  if (flagKey && !flags[flagKey]) {
    return softOff("feature_disabled");
  }

  const preference = (user.aiSourcePreference ?? "auto") as AiSourcePreference;
  if (preference === "disabled") {
    return softOff("user_disabled");
  }

  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    systemAiEnabled: isSystemAiEnabled(flags),
    forceSystem: opts.forceSystem ?? false,
    allowByokFallback: opts.useCustomerKey ?? true,
    aiEngine,
  });

  if ("error" in route) {
    const reason =
      route.error === "no_customer_key" || route.error === "no_system_key"
        ? "no_key"
        : "pool_down";
    return softOff(reason);
  }

  const subscribed = isSubscribed(user.plan ?? "free", user.subscriptionStatus ?? null);
  if (route.mode === "customer" && !subscribed && !isCustomerQuotaUnlimited(aiEngine)) {
    const quotaCheck = checkAiQuota(quotaRow, aiEngine, "customer", { isEnhancement: true });
    if (!quotaCheck.ok) {
      return softOff("quota_exceeded");
    }
  }

  const unlimited = subscribed || (route.mode === "customer" && isCustomerQuotaUnlimited(aiEngine));

  return resolutionFromRoute(route, user, aiEngine, unlimited);
}
