import { getTargetAiModel } from "@/src/lib/config/app.config";
import {
  filterCareerGradeModels,
  suggestPrimaryFuel,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";
import { classifyModelTier, inputCostPer1M } from "@/lib/ai/model-health/classify-model-tier";
import { MODEL_HEALTH_COOLDOWN_MS } from "@/lib/ai/model-health/constants";
import { probeCountsAsHealthy } from "@/lib/ai/model-health/probe-model-capabilities";
import { rankModelIdsForTask } from "@/lib/ai/model-health/score-model-ranking";
import type {
  ModelHealthEntry,
  ModelTier,
  ProviderModelHealth,
  ResolvedModelCandidates,
} from "@/lib/ai/model-health/types";

export function isCooldownActive(
  cooldownUntil: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!cooldownUntil) return false;
  const until = Date.parse(cooldownUntil);
  return Number.isFinite(until) && until > now;
}

export function buildDefaultModelCandidates(
  provider: HandshakeProvider,
  preferredModelId?: string | null,
): ResolvedModelCandidates {
  return buildDefaultModelCandidatesForTask(provider, "flagship", preferredModelId);
}

export function buildDefaultModelCandidatesForTask(
  provider: HandshakeProvider,
  taskTier: ModelTier,
  preferredModelId?: string | null,
): ResolvedModelCandidates {
  const bundled = filterCareerGradeModels(provider, []);
  const tierFiltered = bundled.filter((modelId) => classifyModelTier(modelId) === taskTier);
  const pool = tierFiltered.length > 0 ? tierFiltered : bundled;

  const preferred = preferredModelId?.trim();
  if (provider === "custom" && pool.length === 0) {
    const primary = preferred ?? "";
    return {
      primaryModelId: primary,
      rankedModels: primary ? [primary] : [],
      source: "defaults",
      healthCheckedAt: null,
    };
  }

  const primary =
    preferred && pool.includes(preferred)
      ? preferred
      : taskTier === "cheap"
        ? [...pool].sort((left, right) => inputCostPer1M(left) - inputCostPer1M(right))[0] ??
          pool[0] ??
          suggestPrimaryFuel(provider, pool)
        : suggestPrimaryFuel(provider, pool);

  const ranked = [primary, ...pool.filter((modelId) => modelId !== primary)].slice(0, 5);

  return {
    primaryModelId: primary,
    rankedModels: ranked,
    source: "defaults",
    healthCheckedAt: null,
  };
}

function isHealthyStructuredEntry(
  provider: HandshakeProvider,
  entry: ModelHealthEntry | undefined,
  now: number,
): entry is ModelHealthEntry {
  if (!entry || entry.status !== "healthy") return false;
  if (!probeCountsAsHealthy(provider, entry.probes)) return false;
  if (entry.sunsetHint) return false;
  return !isCooldownActive(entry.cooldownUntil, now);
}

export function resolveCandidatesFromHealthForTask(
  provider: HandshakeProvider,
  health: ProviderModelHealth,
  taskTier: ModelTier,
  preferredModelId?: string | null,
): ResolvedModelCandidates {
  const now = Date.now();

  const availableForTier = (tier: ModelTier): string[] =>
    health.rankedModels.filter((modelId) => {
      const entry = health.entries[modelId];
      if (!isHealthyStructuredEntry(provider, entry, now)) return false;
      return (entry.tier ?? "flagship") === tier;
    });

  let tierPool = availableForTier(taskTier);
  if (tierPool.length === 0) {
    tierPool = health.rankedModels.filter((modelId) =>
      isHealthyStructuredEntry(provider, health.entries[modelId], now),
    );
  }

  const sorted = rankModelIdsForTask(tierPool, health.entries, taskTier);

  const preferred = preferredModelId?.trim();
  const primary =
    preferred && sorted.includes(preferred)
      ? preferred
      : sorted[0] ?? health.primaryModelId ?? getTargetAiModel(provider);

  const ranked = [
    primary,
    ...sorted.filter((modelId) => modelId !== primary),
    ...(provider === "custom"
      ? []
      : buildDefaultModelCandidatesForTask(provider, taskTier).rankedModels.filter((modelId) => {
          if (modelId === primary || sorted.includes(modelId)) return false;
          const entry = health.entries[modelId];
          if (!entry) return true;
          return isHealthyStructuredEntry(provider, entry, now);
        })),
  ].slice(0, 5);

  return {
    primaryModelId: primary,
    rankedModels: ranked,
    source: "health",
    healthCheckedAt: health.checkedAt,
  };
}

export function resolveCandidatesFromHealth(
  provider: HandshakeProvider,
  health: ProviderModelHealth,
  preferredModelId?: string | null,
): ResolvedModelCandidates {
  return resolveCandidatesFromHealthForTask(provider, health, "flagship", preferredModelId);
}

export function buildFailedModelCooldownUntil(now = Date.now()): string {
  return new Date(now + MODEL_HEALTH_COOLDOWN_MS).toISOString();
}
