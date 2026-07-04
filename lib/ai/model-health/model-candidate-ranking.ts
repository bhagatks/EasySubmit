import { getTargetAiModel } from "@/src/lib/config/app.config";
import {
  filterCareerGradeModels,
  suggestPrimaryFuel,
  type HandshakeProvider,
} from "@/src/lib/config/career-grade-models";
import { MODEL_HEALTH_COOLDOWN_MS } from "@/lib/ai/model-health/constants";
import type { ProviderModelHealth, ResolvedModelCandidates } from "@/lib/ai/model-health/types";

function isCooldownActive(cooldownUntil: string | null | undefined, now = Date.now()): boolean {
  if (!cooldownUntil) return false;
  const until = Date.parse(cooldownUntil);
  return Number.isFinite(until) && until > now;
}

export function buildDefaultModelCandidates(
  provider: HandshakeProvider,
  preferredModelId?: string | null,
): ResolvedModelCandidates {
  const bundled = filterCareerGradeModels(provider, []);
  const primary =
    preferredModelId?.trim() && bundled.includes(preferredModelId.trim())
      ? preferredModelId.trim()
      : suggestPrimaryFuel(provider, bundled);
  const ranked = [primary, ...bundled.filter((modelId) => modelId !== primary)].slice(0, 5);

  return {
    primaryModelId: primary,
    rankedModels: ranked,
    source: "defaults",
    healthCheckedAt: null,
  };
}

export function resolveCandidatesFromHealth(
  provider: HandshakeProvider,
  health: ProviderModelHealth,
  preferredModelId?: string | null,
): ResolvedModelCandidates {
  const now = Date.now();
  const available = health.rankedModels.filter((modelId) => {
    const entry = health.entries[modelId];
    if (!entry || entry.status !== "healthy") return false;
    return !isCooldownActive(entry.cooldownUntil, now);
  });

  const preferred = preferredModelId?.trim();
  const primary =
    preferred && available.includes(preferred)
      ? preferred
      : available[0] ?? health.primaryModelId ?? getTargetAiModel(provider);

  const ranked = [
    primary,
    ...available.filter((modelId) => modelId !== primary),
    ...buildDefaultModelCandidates(provider).rankedModels.filter((modelId) => {
      if (modelId === primary || available.includes(modelId)) return false;
      const entry = health.entries[modelId];
      if (!entry) return true;
      if (entry.status !== "healthy") return false;
      return !isCooldownActive(entry.cooldownUntil, now);
    }),
  ].slice(0, 5);

  return {
    primaryModelId: primary,
    rankedModels: ranked,
    source: "health",
    healthCheckedAt: health.checkedAt,
  };
}

export function buildFailedModelCooldownUntil(now = Date.now()): string {
  return new Date(now + MODEL_HEALTH_COOLDOWN_MS).toISOString();
}
