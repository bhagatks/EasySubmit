import type { EnhanceOffReason, FeatureSurface } from "@/lib/features/types";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { resolveEnhanceBlockedMessage } from "@/lib/ai/enhance-failure-messages";
import type { EnhanceRouteError } from "@/lib/ai/system-pool-messages";
import { resolveAiRoute, type AiRouteResolution, type ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import { checkAiQuota } from "@/src/lib/ai/engine/quota";
import {
  formatSystemQuotaBlockedMessage,
  resolveQuotaRowWithReset,
  type SystemQuotaUserRow,
} from "@/src/lib/ai/engine/system-quota-gate";
import type { AiSourcePreference } from "@/src/lib/ai/engine/constants";
import { logEnhanceGate } from "@/src/lib/ai/engine/enhance-diagnostics";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { getAppConfig, isSubscribed } from "@/src/lib/services/config-service";
import { getFeatureFlags, isSystemAiEnabled } from "@/src/lib/services/feature-flags-service";
import { isCustomerQuotaUnlimited } from "@/src/lib/services/ai-engine-config";
import { reconcileUserVaultKeyState } from "@/lib/vault/reconcile-user-vault-key";

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
  /** Dev harness: run AI even when user has aiSourcePreference=disabled. */
  forceAiEnabled?: boolean;
  /** Correlate gate logs with one enhance transaction. */
  traceId?: string;
};

function routeErrorForMessage(route: AiRouteResolution): EnhanceRouteError | undefined {
  if (!("error" in route)) return undefined;
  if (
    route.error === "no_customer_key" ||
    route.error === "no_system_key" ||
    route.error === "system_pool_exhausted"
  ) {
    return route;
  }
  return undefined;
}

function softOff(
  reason: EnhanceOffReason,
  options?: {
    routeError?: EnhanceRouteError;
    quotaMessage?: string;
  },
): import("@/lib/features/types").EnhanceFeatureResolution {
  return {
    baselineAvailable: true,
    aiAvailable: false,
    available: false,
    reason,
    blockedMessage: resolveEnhanceBlockedMessage({
      reason,
      routeError: options?.routeError,
      quotaMessage: options?.quotaMessage,
    }),
    route: null,
    mode: null,
    vaultKeyId: null,
    provider: null,
    modelId: null,
    quota: { used: 0, limit: 0, unlimited: false },
    fallbackAvailable: true,
    systemFallbackRoute: null,
  };
}

function resolutionFromRoute(
  route: ResolvedAiRoute,
  user: SystemQuotaUserRow,
  aiEngine: AiEngineConfig,
  unlimited: boolean,
  systemFallbackRoute: ResolvedAiRoute | null,
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
      limit: unlimited
        ? Infinity
        : route.mode === "system"
          ? aiEngine.quotas.system.dailyUserEnhancements
          : aiEngine.quotas.customer.dailyEnhancements,
      unlimited,
    },
    fallbackAvailable: true,
    systemFallbackRoute,
  };
}

async function resolveSystemFallbackRoute(
  routeUser: SystemQuotaUserRow,
  flags: Awaited<ReturnType<typeof getFeatureFlags>>,
  aiEngine: AiEngineConfig,
): Promise<ResolvedAiRoute | null> {
  const systemRoute = await resolveAiRoute({
    userId: routeUser.id,
    aiSourcePreference: "system",
    vaultKeyId: routeUser.vaultKeyId,
    activeProvider: routeUser.activeProvider,
    userSystemAiEnabled: (routeUser.systemAiEnabled ?? true) && isSystemAiEnabled(flags),
    forceSystem: true,
    allowByokFallback: false,
    forceCustomerRoute: false,
    aiEngine,
  });
  if ("error" in systemRoute) return null;
  return systemRoute;
}

export async function resolveEnhanceFeature(
  user: SystemQuotaUserRow,
  surface: FeatureSurface,
  opts: ResolveEnhanceOpts = {},
): Promise<import("@/lib/features/types").EnhanceFeatureResolution> {
  const reconciled = await reconcileUserVaultKeyState(user.id);
  const routeUser: SystemQuotaUserRow = reconciled.changed
    ? {
        ...user,
        vaultKeyId: reconciled.vaultKeyId,
        activeProvider: reconciled.activeProvider,
      }
    : user;

  const { quotaRow } = resolveQuotaRowWithReset(routeUser);
  const traceId = opts.traceId;

  const gateFlags = {
    surface,
    aiSourcePreference: routeUser.aiSourcePreference ?? "auto",
    hasVaultKey: Boolean(routeUser.vaultKeyId),
    activeProvider: routeUser.activeProvider ?? null,
    forceSystem: opts.forceSystem ?? false,
    forceAiEnabled: opts.forceAiEnabled ?? false,
    useCustomerKey: opts.useCustomerKey ?? true,
  };

  if (!isAiGloballyEnabled()) {
    if (traceId) {
      logEnhanceGate({
        traceId,
        gate: "G1",
        passed: false,
        reason: "globally_disabled",
        flags: gateFlags,
      });
    }
    return softOff("globally_disabled");
  }
  if (traceId) {
    logEnhanceGate({ traceId, gate: "G1", passed: true, flags: gateFlags, level: "light" });
  }

  const [flags, aiEngine] = await Promise.all([
    getFeatureFlags(),
    getAppConfig("aiEngine"),
  ]);

  if (AI_DISABLED_SURFACES.includes(surface)) {
    if (traceId) {
      logEnhanceGate({
        traceId,
        gate: "G2",
        passed: false,
        reason: "user_disabled",
        flags: { ...gateFlags, onboardingSurface: true },
      });
    }
    return softOff("user_disabled");
  }

  const flagKey = SURFACE_FLAG_MAP[surface];
  if (flagKey && !flags[flagKey]) {
    if (traceId) {
      logEnhanceGate({
        traceId,
        gate: "G2",
        passed: false,
        reason: "feature_disabled",
        flags: { ...gateFlags, featureFlag: flagKey, featureEnabled: false },
      });
    }
    return softOff("feature_disabled");
  }
  if (traceId) {
    logEnhanceGate({
      traceId,
      gate: "G2",
      passed: true,
      flags: { ...gateFlags, featureFlag: flagKey ?? "none" },
      level: "light",
    });
  }

  const preference = (routeUser.aiSourcePreference ?? "auto") as AiSourcePreference;
  if (preference === "disabled" && !opts.forceAiEnabled) {
    if (traceId) {
      logEnhanceGate({
        traceId,
        gate: "G3",
        passed: false,
        reason: "user_disabled",
        flags: gateFlags,
      });
    }
    return softOff("user_disabled");
  }
  if (traceId) {
    logEnhanceGate({ traceId, gate: "G3", passed: true, flags: gateFlags, level: "light" });
  }
  const routePreference: AiSourcePreference =
    preference === "disabled" && opts.forceAiEnabled
      ? opts.forceSystem
        ? "system"
        : "auto"
      : preference;

  if (traceId) {
    logEnhanceGate({
      traceId,
      gate: "G4",
      passed: true,
      flags: { ...gateFlags, systemAiEnabled: aiEngine.enabled },
      level: "light",
    });
  }

  const route = await resolveAiRoute({
    userId: routeUser.id,
    aiSourcePreference: routePreference,
    vaultKeyId: routeUser.vaultKeyId,
    activeProvider: routeUser.activeProvider,
    userSystemAiEnabled: (routeUser.systemAiEnabled ?? true) && isSystemAiEnabled(flags),
    forceSystem: opts.forceSystem ?? false,
    allowByokFallback: opts.useCustomerKey ?? true,
    forceCustomerRoute: opts.useCustomerKey === true,
    aiEngine,
  });

  if ("error" in route) {
    const reason =
      route.error === "no_customer_key" || route.error === "no_system_key"
        ? "no_key"
        : route.error === "ai_disabled"
          ? "user_disabled"
        : "pool_down";
    if (traceId) {
      logEnhanceGate({
        traceId,
        gate: "G5",
        passed: false,
        reason,
        flags: {
          ...gateFlags,
          routeError: route.error,
          systemAiEnabled: aiEngine.enabled,
        },
      });
    }
    return softOff(reason, { routeError: routeErrorForMessage(route) });
  }
  if (traceId) {
    logEnhanceGate({
      traceId,
      gate: "G5",
      passed: true,
      flags: {
        ...gateFlags,
        routeMode: route.mode,
        modelId: route.modelId,
        provider: route.mode === "customer" ? route.provider : "system",
        vaultKeyId: route.mode === "customer" ? route.vaultKeyId : null,
      },
      level: "low",
    });
  }

  const subscribed = isSubscribed(user.plan ?? "free", user.subscriptionStatus ?? null);
  if (route.mode === "customer" && !subscribed && !isCustomerQuotaUnlimited(aiEngine)) {
    const quotaCheck = checkAiQuota(quotaRow, aiEngine, "customer", { isEnhancement: true });
    if (!quotaCheck.ok) {
      if (traceId) {
        logEnhanceGate({
          traceId,
          gate: "G6",
          passed: false,
          reason: "quota_exceeded",
          flags: {
            ...gateFlags,
            subscribed,
            enhancementsToday: user.aiEnhancementsToday,
            callsToday: user.aiCallsToday,
          },
        });
      }
      return softOff("quota_exceeded", {
        quotaMessage: formatSystemQuotaBlockedMessage(quotaCheck),
      });
    }
  }
  if (traceId) {
    logEnhanceGate({
      traceId,
      gate: "G6",
      passed: true,
      flags: {
        ...gateFlags,
        subscribed,
        quotaSkipped: route.mode === "system" || subscribed,
      },
      level: "light",
    });
  }

  const unlimited = subscribed || (route.mode === "customer" && isCustomerQuotaUnlimited(aiEngine));

  const systemFallbackRoute =
    route.mode === "customer"
      ? await resolveSystemFallbackRoute(routeUser, flags, aiEngine)
      : route;

  return resolutionFromRoute(route, routeUser, aiEngine, unlimited, systemFallbackRoute);
}
