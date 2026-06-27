import type { AiProvider } from "@/src/lib/config/app.config";
import { getTargetAiModel } from "@/src/lib/config/app.config";
import { isHandshakeProvider, type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { AI_ENGINE_DEFAULTS } from "@/src/lib/services/ai-engine-config";
import type { AiRouteMode, AiSourcePreference } from "@/src/lib/ai/engine/constants";
import { isAiGloballyEnabled } from "@/lib/ai/ai-global-enabled";
import { hasHealthySystemPoolSlot, hasSystemGeminiKeys } from "@/src/lib/ai/engine/system-key-pool";

export type ResolvedAiRoute =
  | {
      mode: "customer";
      provider: HandshakeProvider;
      modelId: string;
      vaultKeyId: string;
    }
  | {
      mode: "system";
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
  _preference: AiSourcePreference,
  hasVaultKey: boolean,
  systemAiEnabled: boolean,
  forceSystem = false,
): AiRouteMode {
  if (!systemAiEnabled) {
    return "customer";
  }

  if (forceSystem) return "system";
  return hasVaultKey ? "customer" : "system";
}

export function resolveCustomerModelId(
  provider: AiProvider,
  activeModel?: string | null,
): string {
  const trimmed = activeModel?.trim();
  if (trimmed) return trimmed;
  return getTargetAiModel(provider);
}

function resolveCustomerRouteFromVault(input: {
  vaultKeyId: string | null;
  activeProvider: string | null;
  activeModel?: string | null;
}): ResolvedAiRoute | null {
  if (!input.vaultKeyId) return null;
  if (!input.activeProvider || !isHandshakeProvider(input.activeProvider)) return null;
  return {
    mode: "customer",
    provider: input.activeProvider,
    modelId: resolveCustomerModelId(input.activeProvider, input.activeModel),
    vaultKeyId: input.vaultKeyId,
  };
}

export async function resolveAiRoute(input: {
  aiSourcePreference: AiSourcePreference;
  vaultKeyId: string | null;
  activeProvider: string | null;
  activeModel?: string | null;
  forceSystem?: boolean;
  /** When true, user explicitly chose to use their vault key (e.g. enhance retry). */
  allowByokFallback?: boolean;
  aiEngine?: AiEngineConfig;
  /** From `feature_flags.system_ai_enabled` — when false, routes to BYOK only. */
  systemAiEnabled?: boolean;
}): Promise<AiRouteResolution> {
  if (!isAiGloballyEnabled()) {
    return { error: "ai_globally_disabled" };
  }

  if (input.aiSourcePreference === "disabled") {
    return { error: "ai_disabled" };
  }

  const engine = input.aiEngine ?? AI_ENGINE_DEFAULTS;
  const systemAiEnabled = input.systemAiEnabled ?? true;
  const mode = resolveEffectiveAiSource(
    input.aiSourcePreference,
    Boolean(input.vaultKeyId),
    systemAiEnabled,
    input.forceSystem,
  );

  if (mode === "system") {
    const customerFallback = resolveCustomerRouteFromVault(input);

    if (!(await hasSystemGeminiKeys(engine))) {
      if (input.allowByokFallback && customerFallback) return customerFallback;
      return { error: "no_system_key" };
    }

    if (!(await hasHealthySystemPoolSlot(engine))) {
      if (input.allowByokFallback && customerFallback) return customerFallback;
      return {
        error: "system_pool_exhausted",
        byokAvailable: Boolean(customerFallback),
      };
    }

    return {
      mode: "system",
      modelId: engine.system.modelId,
    };
  }

  if (!input.vaultKeyId) {
    return { error: "no_customer_key" };
  }

  if (!input.activeProvider || !isHandshakeProvider(input.activeProvider)) {
    return { error: "no_customer_key" };
  }

  return {
    mode: "customer",
    provider: input.activeProvider,
    modelId: resolveCustomerModelId(input.activeProvider, input.activeModel),
    vaultKeyId: input.vaultKeyId,
  };
}

/** @deprecated Sync resolver removed — use resolveAiRoute(). */
export function resolveAiRouteSync(): never {
  throw new Error("resolveAiRouteSync is removed — use await resolveAiRoute()");
}
