import { performEngineHandshake } from "@/src/lib/ai/discovery-service";
import { getDefaultModelsForProvider } from "@/src/lib/config/app.config";
import { prisma } from "@/lib/prisma";
import { logApiCall } from "@/src/shared/observability";
import {
  classifyModelTier,
  inputCostPer1M,
  suggestDiscoveredPrimaryFuel,
} from "@/lib/ai/model-health/classify-model-tier";
import {
  MODEL_HEALTH_MAX_PROBE_COUNT,
} from "@/lib/ai/model-health/constants";
import { buildFailedModelCooldownUntil } from "@/lib/ai/model-health/model-candidate-ranking";
import { probeModelCapabilities, probeCountsAsHealthy } from "@/lib/ai/model-health/probe-model-capabilities";
import {
  rankModelIdsForTask,
  selectModelsToProbe,
} from "@/lib/ai/model-health/score-model-ranking";
import type {
  ModelHealthEntry,
  ProviderModelHealth,
  RefreshProviderModelHealthInput,
} from "@/lib/ai/model-health/types";
import { getAppConfig } from "@/src/lib/services/config-service";
import type { AiPricingMap } from "@/src/lib/services/ai-pricing-map";
import { AI_PRICING_MAP_DEFAULT } from "@/src/lib/services/ai-pricing-map";

function rankHealthyModels(
  entries: Record<string, ModelHealthEntry>,
  provider: RefreshProviderModelHealthInput["provider"],
): string[] {
  const healthyIds = Object.values(entries)
    .filter(
      (entry) =>
        entry.status === "healthy" &&
        probeCountsAsHealthy(provider, entry.probes),
    )
    .map((entry) => entry.modelId);

  const cheapRanked = rankModelIdsForTask(healthyIds, entries, "cheap");
  const flagshipRanked = rankModelIdsForTask(healthyIds, entries, "flagship");

  const merged: string[] = [];
  for (const id of cheapRanked) {
    if (!merged.includes(id)) merged.push(id);
  }
  for (const id of flagshipRanked) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged.length > 0 ? merged : healthyIds;
}

export async function refreshProviderModelHealth(
  input: RefreshProviderModelHealthInput,
): Promise<ProviderModelHealth> {
  const startedAt = Date.now();
  const traceId = input.traceId ?? "model-health";

  let pricingMap: AiPricingMap = AI_PRICING_MAP_DEFAULT;
  try {
    pricingMap = await getAppConfig("ai_pricing_map");
  } catch {
    pricingMap = AI_PRICING_MAP_DEFAULT;
  }

  const discovery = await performEngineHandshake({
    provider: input.provider,
    apiKey: input.apiKey,
    customEndpointUrl: input.customEndpointUrl,
  });

  if (!discovery.success) {
    logApiCall({
      traceId,
      userId: input.userId,
      domain: "ai",
      operation: "ai.model_health.refresh",
      provider: input.provider,
      status: "error",
      durationMs: Date.now() - startedAt,
      aiMode: "customer",
      keySource: "vault",
      errorCode: discovery.error.code,
      errorMessage: discovery.error.message,
      metadata: { feature: "model_health" },
    });
    throw new Error(discovery.error.message);
  }

  const discoverablePool = [
    ...new Set([
      ...getDefaultModelsForProvider(input.provider),
      ...discovery.models,
    ]),
  ];

  const candidates = selectModelsToProbe(
    discoverablePool,
    (modelId) => classifyModelTier(modelId, pricingMap),
    (modelId) => inputCostPer1M(modelId, pricingMap),
    MODEL_HEALTH_MAX_PROBE_COUNT,
    getDefaultModelsForProvider(input.provider),
  );

  const entries: Record<string, ModelHealthEntry> = {};
  const checkedAt = new Date().toISOString();

  for (const modelId of candidates) {
    const probes = await probeModelCapabilities({
      provider: input.provider,
      apiKey: input.apiKey,
      modelId,
      customEndpointUrl: input.customEndpointUrl,
    });
    const healthy = probeCountsAsHealthy(input.provider, probes);
    entries[modelId] = {
      modelId,
      status: healthy ? "healthy" : "failed",
      lastCheckedAt: checkedAt,
      lastError: healthy ? null : probes.error ?? "probe_failed",
      cooldownUntil: healthy ? null : buildFailedModelCooldownUntil(),
      probes: {
        text: probes.text,
        structured: probes.structured,
        error: probes.error,
      },
      tier: classifyModelTier(modelId, pricingMap),
      inputCostPer1M: inputCostPer1M(modelId, pricingMap),
      lastLatencyMs: probes.lastLatencyMs,
      sunsetHint: false,
    };

    logApiCall({
      traceId,
      userId: input.userId,
      domain: "ai",
      operation: "ai.model_health.probe",
      provider: input.provider,
      modelId,
      status: healthy ? "success" : "error",
      durationMs: probes.lastLatencyMs,
      aiMode: "customer",
      keySource: "vault",
      errorCode: healthy ? null : "provider_error",
      errorMessage: healthy ? null : probes.error ?? "probe_failed",
      metadata: {
        feature: "model_health",
        tier: entries[modelId]!.tier,
        structuredOk: probes.structured,
        textOnlyHealthy: healthy && !probes.structured,
      },
    });
  }

  const rankedModels = rankHealthyModels(entries, input.provider);
  const primaryModelId =
    rankedModels.find((modelId) => entries[modelId]?.tier === "flagship") ??
    suggestDiscoveredPrimaryFuel(discovery.models, pricingMap) ??
    rankedModels[0] ??
    null;

  const health: ProviderModelHealth = {
    checkedAt,
    primaryModelId,
    rankedModels,
    discoveredCount: discovery.rawModelCount,
    entries,
  };

  await prisma.userApiKey.update({
    where: {
      userId_provider: { userId: input.userId, provider: input.provider },
    },
    data: { modelHealth: health },
  });

  logApiCall({
    traceId,
    userId: input.userId,
    domain: "ai",
    operation: "ai.model_health.refresh",
    provider: input.provider,
    status: "success",
    durationMs: Date.now() - startedAt,
    aiMode: "customer",
    keySource: "vault",
    metadata: {
      feature: "model_health",
      probedCount: candidates.length,
      healthyCount: rankedModels.length,
      primaryModelId: health.primaryModelId,
    },
  });

  return health;
}
