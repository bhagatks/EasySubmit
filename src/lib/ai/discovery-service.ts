/**
 * Engine discovery handshake — AutoApplyAI-style model list fetch with
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
import {
  intersectCareerGradeModels,
  isHandshakeProvider,
  suggestPrimaryFuel,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";

export type EngineHandshakeInput = {
  provider: HandshakeProvider;
  apiKey: string;
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
): Promise<ProviderHandshakeResult> {
  return handshakeProviderModels(provider, apiKey);
}

/**
 * Handshake: hit provider models endpoint, confirm key validity, and verify
 * career-grade model access (strict — no bundled fallback).
 */
export async function performEngineHandshake(
  input: EngineHandshakeInput,
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

  const catalog = await fetchProviderModelCatalog(handshakeProvider, apiKey);
  if (!catalog.ok) {
    return toFailure(catalog);
  }

  const careerGradeModels = intersectCareerGradeModels(handshakeProvider, catalog.models);

  if (careerGradeModels.length === 0) {
    return {
      success: false,
      error: formatEngineTerminalError(
        ENGINE_ERRORS.NO_CAREER_MODELS,
        catalog.models.length > 0
          ? `Listed ${catalog.models.length} models but none are career-grade for ${getProviderConfig(handshakeProvider).label}.`
          : undefined,
      ),
    };
  }

  return {
    success: true,
    provider: handshakeProvider,
    providerLabel: getProviderConfig(handshakeProvider).label,
    models: careerGradeModels,
    careerGradeModels,
    suggestedPrimaryFuel: suggestPrimaryFuel(handshakeProvider, careerGradeModels),
    discoveredAt: Date.now(),
    rawModelCount: catalog.models.length,
  };
}
