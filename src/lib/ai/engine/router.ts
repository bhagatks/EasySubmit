import type { AiProvider } from "@/src/lib/config/app.config";
import { getTargetAiModel } from "@/src/lib/config/app.config";
import { isHandshakeProvider, type HandshakeProvider } from "@/src/lib/config/career-grade-models";
import type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
import { AI_ENGINE_DEFAULTS, isSystemAiEnabled } from "@/src/lib/services/ai-engine-config";
import type { AiRouteMode, AiSourcePreference } from "@/src/lib/ai/engine/constants";
import { hasSystemGeminiKeys } from "@/src/lib/ai/engine/system-key-pool";

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

export function resolveEffectiveAiSource(
  preference: AiSourcePreference,
  hasVaultKey: boolean,
  aiEngine: AiEngineConfig = AI_ENGINE_DEFAULTS,
  forceSystem = false,
): AiRouteMode {
  if (!isSystemAiEnabled(aiEngine)) {
    return "customer";
  }

  if (forceSystem) return "system";
  if (preference === "system") return "system";
  if (preference === "customer") return hasVaultKey ? "customer" : "system";
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

export async function resolveAiRoute(input: {
  aiSourcePreference: AiSourcePreference;
  vaultKeyId: string | null;
  activeProvider: string | null;
  activeModel?: string | null;
  forceSystem?: boolean;
  aiEngine?: AiEngineConfig;
}): Promise<ResolvedAiRoute | { error: "no_customer_key" | "no_system_key" }> {
  const engine = input.aiEngine ?? AI_ENGINE_DEFAULTS;
  const mode = resolveEffectiveAiSource(
    input.aiSourcePreference,
    Boolean(input.vaultKeyId),
    engine,
    input.forceSystem,
  );

  if (mode === "system") {
    if (!(await hasSystemGeminiKeys(engine))) {
      return { error: "no_system_key" };
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
