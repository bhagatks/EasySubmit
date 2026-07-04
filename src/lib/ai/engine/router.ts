import type { AiProvider } from "@/src/lib/config/app.config";
import { getTargetAiModel } from "@/src/lib/config/app.config";
import { isHandshakeProvider, type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";
import type { AiRouteMode, AiSourcePreference } from "@/src/lib/ai/engine/constants";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { hasHealthySystemPoolSlot, hasSystemPoolKeys } from "@/src/lib/ai/engine/system-key-pool";
import { resolveCustomerModelCandidates } from "@/lib/ai/model-health/resolve-model-candidates";

export type ResolvedAiRoute =
  | {
      mode: "customer";
      provider: HandshakeProvider;
      modelId: string;
      modelCandidates: string[];
      vaultKeyId: string;
    }
  | {
      mode: "system";
      provider: AiProvider;
      modelId: string;
    };

export type AiRouteResolution =
  | ResolvedAiRoute
  | { error: "no_customer_key" }
  | { error: "no_system_key" }
  | { error: "system_pool_exhausted"; byokAvailable: boolean }
  | { error: "ai_globally_disabled" }
  | { error: "ai_disabled" };

export const SYSTEM_POOL_EXHAUSTED_HEADLINE =
  "EasySubmit's shared AI is temporarily unavailable.";

export const SYSTEM_POOL_EXHAUSTED_BYOK_BODY =
  "Use your own API key for this enhance, or change AI source in Settings.";

export const SYSTEM_POOL_EXHAUSTED_NO_BYOK_BODY =
  "Try again later, or add your API key in AI Keys.";

export function resolveEffectiveAiSource(
  preference: AiSourcePreference,
  hasVaultKey: boolean,
  systemAiEnabled: boolean,
  forceSystem = false,
  forceCustomer = false,
): AiRouteMode {
  if (forceCustomer && hasVaultKey) {
    return "customer";
  }

  if (forceSystem && systemAiEnabled) {
    return "system";
  }

  if (preference === "system" && systemAiEnabled) {
    return "system";
  }

  if (preference === "customer" || (preference === "auto" && hasVaultKey)) {
    return "customer";
  }

  if (!systemAiEnabled) {
    return "customer";
  }

  return "system";
}

export function resolveCustomerModelId(
  provider: AiProvider,
  activeModel?: string | null,
): string {
  const trimmed = activeModel?.trim();
  if (trimmed) return trimmed;
  return getTargetAiModel(provider);
}

async function resolveCustomerRouteFromVault(input: {
  userId?: string | null;
  vaultKeyId: string | null;
  activeProvider: string | null;
  activeModel?: string | null;
}): Promise<ResolvedAiRoute | null> {
  if (!input.vaultKeyId) return null;
  if (!input.activeProvider || !isHandshakeProvider(input.activeProvider)) return null;

  const provider = input.activeProvider;
  const preferredModelId = resolveCustomerModelId(provider, input.activeModel);

  if (input.userId) {
    const candidates = await resolveCustomerModelCandidates({
      userId: input.userId,
      provider,
      preferredModelId: input.activeModel,
    });
    return {
      mode: "customer",
      provider,
      modelId: candidates.primaryModelId,
      modelCandidates: candidates.rankedModels,
      vaultKeyId: input.vaultKeyId,
    };
  }

  return {
    mode: "customer",
    provider,
    modelId: preferredModelId,
    modelCandidates: [preferredModelId],
    vaultKeyId: input.vaultKeyId,
  };
}

export async function resolveAiRoute(input: {
  userId?: string | null;
  aiSourcePreference: AiSourcePreference;
  vaultKeyId: string | null;
  activeProvider: string | null;
  activeModel?: string | null;
  forceSystem?: boolean;
  /** When true, user explicitly chose to use their vault key (e.g. enhance retry). */
  allowByokFallback?: boolean;
  /** When true, route to BYOK even if system pool is healthy (extension/dashboard retry). */
  forceCustomerRoute?: boolean;
  aiEngine?: AiEngineConfig;
  /** Per-user flag: when false (free tier), forces BYOK-only mode. */
  userSystemAiEnabled?: boolean;
}): Promise<AiRouteResolution> {
  if (!isAiGloballyEnabled()) {
    return { error: "ai_globally_disabled" };
  }

  if (input.aiSourcePreference === "disabled") {
    return { error: "ai_disabled" };
  }

  const engine = input.aiEngine ?? AI_ENGINE_DEFAULTS;
  const systemAiEnabled = engine.enabled && (input.userSystemAiEnabled ?? true);
  const mode = resolveEffectiveAiSource(
    input.aiSourcePreference,
    Boolean(input.vaultKeyId),
    systemAiEnabled,
    input.forceSystem,
    input.forceCustomerRoute === true,
  );

  if (mode === "system") {
    const customerFallback = await resolveCustomerRouteFromVault(input);

    if (!(await hasSystemPoolKeys(engine))) {
      if (customerFallback) return customerFallback;
      return { error: "no_system_key" };
    }

    if (!(await hasHealthySystemPoolSlot(engine))) {
      if (customerFallback) return customerFallback;
      return {
        error: "system_pool_exhausted",
        byokAvailable: Boolean(customerFallback),
      };
    }

    return {
      mode: "system",
      provider: engine.system.provider,
      modelId: engine.system.modelId,
    };
  }

  if (!input.vaultKeyId) {
    return { error: "no_customer_key" };
  }

  if (!input.activeProvider || !isHandshakeProvider(input.activeProvider)) {
    return { error: "no_customer_key" };
  }

  const customerRoute = await resolveCustomerRouteFromVault(input);
  if (!customerRoute) {
    return { error: "no_customer_key" };
  }

  return customerRoute;
}

/** @deprecated Sync resolver removed — use resolveAiRoute(). */
export function resolveAiRouteSync(): never {
  throw new Error("resolveAiRouteSync is removed — use await resolveAiRoute()");
}
