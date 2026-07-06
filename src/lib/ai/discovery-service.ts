/**
 * Engine discovery handshake — provider model list fetch with
 * career-grade access validation and structured ENGINE_ERRORS.
 */
import {
  handshakeProviderModels,
  type ProviderHandshakeResult,
} from "@/src/lib/ai/server-model-discovery";
import {
  ENGINE_ERRORS,
  formatEngineTerminalError,
  mapProviderFailureToEngineError,
  type EngineTerminalError,
} from "@/src/lib/ai/engine-errors";
import { getProviderConfig } from "@/src/lib/config/app.config";
import { resolveDiscoverableModels } from "@/lib/ai/model-health/discover-chat-models";
import { suggestDiscoveredPrimaryFuel } from "@/lib/ai/model-health/classify-model-tier";
import {
  isHandshakeProvider,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";
import { logApiCall, type ApiCallLogContext } from "@/src/shared/observability";

export type EngineHandshakeInput = {
  provider: HandshakeProvider;
  apiKey: string;
  customEndpointUrl?: string | null;
};

export type EngineHandshakeSuccess = {
  success: true;
  provider: HandshakeProvider;
  providerLabel: string;
  models: string[];
  careerGradeModels: string[];
  suggestedPrimaryFuel: string;
  discoveredAt: number;
  rawModelCount: number;
};

export type EngineHandshakeFailure = {
  success: false;
  error: EngineTerminalError;
};

export type EngineHandshakeResult = EngineHandshakeSuccess | EngineHandshakeFailure;

function toFailure(
  result: Extract<ProviderHandshakeResult, { ok: false }>,
): EngineHandshakeFailure {
  return {
    success: false,
    error: mapProviderFailureToEngineError(result.code, result.message),
  };
}

async function fetchProviderModelCatalog(
  provider: HandshakeProvider,
  apiKey: string,
  customEndpointUrl?: string | null,
): Promise<ProviderHandshakeResult> {
  return handshakeProviderModels(provider, apiKey, { customEndpointUrl });
}

/**
 * Handshake: hit provider models endpoint (or chat probe fallback), confirm key
 * validity, and resolve career-grade models with bundled defaults when needed.
 */
export async function performEngineHandshake(
  input: EngineHandshakeInput,
  logContext?: ApiCallLogContext,
): Promise<EngineHandshakeResult> {
  const provider = input.provider;

  if (!isHandshakeProvider(provider)) {
    return {
      success: false,
      error: formatEngineTerminalError(ENGINE_ERRORS.INVALID_PROVIDER),
    };
  }

  const handshakeProvider = provider;

  const apiKey = input.apiKey?.trim() ?? "";
  if (!apiKey) {
    return {
      success: false,
      error: formatEngineTerminalError(ENGINE_ERRORS.MISSING_KEY),
    };
  }

  const catalogStartedAt = Date.now();
  const catalog = await fetchProviderModelCatalog(
    handshakeProvider,
    apiKey,
    input.customEndpointUrl,
  );
  logApiCall({
    traceId: logContext?.traceId,
    userId: logContext?.userId,
    domain: "ai",
    operation: "ai.discovery.models_list",
    provider: handshakeProvider,
    status: catalog.ok ? "success" : "error",
    durationMs: Date.now() - catalogStartedAt,
    aiMode: "customer",
    errorCode: catalog.ok ? null : catalog.code,
    errorMessage: catalog.ok ? null : catalog.message,
    metadata: catalog.ok
      ? { rawModelCount: catalog.models.length, feature: "ignition_handshake" }
      : { feature: "ignition_handshake" },
  });

  if (!catalog.ok) {
    return toFailure(catalog);
  }

  const discoverableModels = resolveDiscoverableModels(handshakeProvider, catalog.models);

  if (discoverableModels.length === 0) {
    return {
      success: false,
      error: formatEngineTerminalError(
        ENGINE_ERRORS.NO_CAREER_MODELS,
        catalog.models.length > 0
          ? `Listed ${catalog.models.length} models but none are usable for ${getProviderConfig(handshakeProvider).label}.`
          : undefined,
      ),
    };
  }

  return {
    success: true,
    provider: handshakeProvider,
    providerLabel: getProviderConfig(handshakeProvider).label,
    models: discoverableModels,
    careerGradeModels: discoverableModels,
    suggestedPrimaryFuel: suggestDiscoveredPrimaryFuel(discoverableModels),
    discoveredAt: Date.now(),
    rawModelCount: catalog.models.length,
  };
}
