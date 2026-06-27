import type { EnhanceFeatureResolution, FeatureSurface } from "@/lib/features/types";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { resolveAiRoute } from "@/src/lib/ai/engine/router";
import { resolveQuotaRowWithReset } from "@/src/lib/ai/engine/system-quota-gate";
import { checkAiQuota } from "@/src/lib/ai/engine/quota";
import { getAppConfig, isSubscribed } from "@/src/lib/services/config-service";
import { getFeatureFlags, isSystemAiEnabled } from "@/src/lib/services/feature-flags-service";
import { isCustomerQuotaUnlimited } from "@/src/lib/services/ai-engine-config";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import type { SystemQuotaUserRow } from "@/src/lib/ai/engine/system-quota-gate";

/** Which feature flag gates each surface. */
const SURFACE_FLAG_MAP = {
  onboarding: null,
  job_apply: "enhanceWithAiResumeProfile",
  resume: "enhanceWithAiResumeProfile",
  extension: "enhanceWithAiResumeProfile",
} as const satisfies Record<FeatureSurface, keyof Awaited<ReturnType<typeof getFeatureFlags>> | null>;

/**
 * Onboarding always uses the deterministic engine — AI call is intentionally
 * skipped to avoid quota burn and keep the experience fast.
 */
const AI_DISABLED_SURFACES: FeatureSurface[] = ["onboarding"];

const OFF: EnhanceFeatureResolution = {
  available: false,
  mode: null,
  vaultKeyId: null,
  provider: null,
  modelId: null,
  quota: { used: 0, limit: 0, unlimited: false },
  fallbackAvailable: true,
};

export type ResolveEnhanceOpts = {
  forceSystem?: boolean;
  useCustomerKey?: boolean;
};

export async function resolveEnhanceFeature(
  user: SystemQuotaUserRow,
  surface: FeatureSurface,
  opts: ResolveEnhanceOpts = {},
): Promise<EnhanceFeatureResolution> {
  // G1 — global kill switch
  if (!isAiGloballyEnabled()) {
    return { ...OFF, reason: "globally_disabled" };
  }

  const [flags, aiEngine] = await Promise.all([
    getFeatureFlags(),
    getAppConfig("aiEngine"),
  ]);

  // Onboarding has no flag — always runs deterministic engine directly.
  if (AI_DISABLED_SURFACES.includes(surface)) {
    return { ...OFF, reason: "user_disabled" };
  }

  // G2 — feature flag for all other surfaces
  const flagKey = SURFACE_FLAG_MAP[surface];
  if (flagKey && !flags[flagKey]) {
    return { ...OFF, reason: "feature_disabled" };
  }

  // G3 — user AI preference
  const preference = (user.aiSourcePreference ?? "auto") as AiSourcePreference;
  if (preference === "disabled") {
    return { ...OFF, reason: "user_disabled" };
  }

  // G4 + G5 — route resolution (handles systemAiEnabled flag internally)
  const route = await resolveAiRoute({
    aiSourcePreference: preference,
    vaultKeyId: user.vaultKeyId,
    activeProvider: user.activeProvider,
    systemAiEnabled: isSystemAiEnabled(flags),
    forceSystem: opts.forceSystem ?? false,
    allowByokFallback: opts.useCustomerKey ?? false,
    aiEngine,
  });

  if ("error" in route) {
    const reason =
      route.error === "no_customer_key" || route.error === "no_system_key"
        ? "no_key"
        : "pool_down";
    return { ...OFF, reason };
  }

  // G6 — quota (customer mode, non-subscribed, no admin bypass)
  const subscribed = isSubscribed(user.plan ?? "free", user.subscriptionStatus ?? null);
  if (route.mode === "customer" && !subscribed && !isCustomerQuotaUnlimited(aiEngine)) {
    const { quotaRow } = resolveQuotaRowWithReset(user);
    const quotaCheck = checkAiQuota(quotaRow, aiEngine, "customer", { isEnhancement: true });
    if (!quotaCheck.ok) {
      return { ...OFF, reason: "quota_exceeded" };
    }
  }

  const { quotaRow } = resolveQuotaRowWithReset(user);
  const unlimited = subscribed || (route.mode === "customer" && isCustomerQuotaUnlimited(aiEngine));

  return {
    available: true,
    mode: route.mode,
    vaultKeyId: route.mode === "customer" ? route.vaultKeyId : null,
    provider: route.mode === "customer" ? route.provider : null,
    modelId: route.modelId,
    quota: {
      used: quotaRow.aiEnhancementsToday,
      limit: unlimited ? Infinity : aiEngine.quotas[route.mode].dailyEnhancements,
      unlimited,
    },
    fallbackAvailable: true,
  };
}
