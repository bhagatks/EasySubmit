import { performEngineHandshake } from "@/src/lib/ai/discovery-service";
import { filterCareerGradeModels } from "@/src/lib/config/career-grade-models";
import { prisma } from "@/lib/prisma";
import { logApiCall } from "@/src/shared/observability";
import {
  MODEL_HEALTH_MAX_PROBE_COUNT,
} from "@/lib/ai/model-health/constants";
import { buildFailedModelCooldownUntil } from "@/lib/ai/model-health/model-candidate-ranking";
import { probeModelCapabilities } from "@/lib/ai/model-health/probe-model-capabilities";
import type {
  ModelHealthEntry,
  ProviderModelHealth,
  RefreshProviderModelHealthInput,
} from "@/lib/ai/model-health/types";

function rankHealthyModels(entries: Record<string, ModelHealthEntry>): string[] {
  return Object.values(entries)
    .filter((entry) => entry.status === "healthy")
    .sort((left, right) => {
      const leftScore = (left.probes.structured ? 0 : 1) + (left.probes.text ? 0 : 2);
      const rightScore = (right.probes.structured ? 0 : 1) + (right.probes.text ? 0 : 2);
      if (leftScore !== rightScore) return leftScore - rightScore;
      return left.modelId.localeCompare(right.modelId);
    })
    .map((entry) => entry.modelId);
}

export async function refreshProviderModelHealth(
  input: RefreshProviderModelHealthInput,
): Promise<ProviderModelHealth> {
  const startedAt = Date.now();
  const traceId = input.traceId ?? "model-health";

  const discovery = await performEngineHandshake({
    provider: input.provider,
    apiKey: input.apiKey,
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

  const candidates = filterCareerGradeModels(input.provider, discovery.models).slice(
    0,
    MODEL_HEALTH_MAX_PROBE_COUNT,
  );

  const entries: Record<string, ModelHealthEntry> = {};
  const checkedAt = new Date().toISOString();

  for (const modelId of candidates) {
    const probes = await probeModelCapabilities({
      provider: input.provider,
      apiKey: input.apiKey,
      modelId,
    });
    entries[modelId] = {
      modelId,
      status: probes.text ? "healthy" : "failed",
      lastCheckedAt: checkedAt,
      lastError: probes.text ? null : probes.error ?? "probe_failed",
      cooldownUntil: probes.text ? null : buildFailedModelCooldownUntil(),
      probes,
    };

    logApiCall({
      traceId,
      userId: input.userId,
      domain: "ai",
      operation: "ai.model_health.probe",
      provider: input.provider,
      modelId,
      status: probes.text ? "success" : "error",
      durationMs: 0,
      aiMode: "customer",
      keySource: "vault",
      errorCode: probes.text ? null : "provider_error",
      errorMessage: probes.text ? null : probes.error ?? "probe_failed",
      metadata: {
        feature: "model_health",
        structuredOk: probes.structured,
      },
    });
  }

  const rankedModels = rankHealthyModels(entries);
  const health: ProviderModelHealth = {
    checkedAt,
    primaryModelId: rankedModels[0] ?? discovery.suggestedPrimaryFuel,
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
