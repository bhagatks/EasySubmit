import { prisma } from "@/lib/prisma";
import { getUserApiKeyCredentials } from "@/lib/vault/user-key-vault";
import type { HandshakeProvider } from "@/src/lib/config/career-grade-models";
import { MODEL_HEALTH_STALE_MS } from "@/lib/ai/model-health/constants";
import {
  buildDefaultModelCandidates,
  buildFailedModelCooldownUntil,
  resolveCandidatesFromHealth,
} from "@/lib/ai/model-health/model-candidate-ranking";
import { parseProviderModelHealth } from "@/lib/ai/model-health/parse-provider-model-health";
import { refreshProviderModelHealth } from "@/lib/ai/model-health/refresh-provider-model-health";
import type {
  ProviderModelHealth,
  ResolveModelCandidatesInput,
  ResolvedModelCandidates,
} from "@/lib/ai/model-health/types";

function isModelSunsetError(errorMessage?: string | null): boolean {
  if (!errorMessage) return false;
  return /404|410|not found|model_not_found|does not exist|deprecated|sunset|no longer available|invalid model/i.test(
    errorMessage,
  );
}

export {
  buildDefaultModelCandidates,
  buildDefaultModelCandidatesForTask,
  resolveCandidatesFromHealth,
  resolveCandidatesFromHealthForTask,
} from "@/lib/ai/model-health/model-candidate-ranking";

export async function loadProviderModelHealth(
  userId: string,
  provider: HandshakeProvider,
): Promise<ProviderModelHealth | null> {
  const row = await prisma.userApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { modelHealth: true },
  });
  return parseProviderModelHealth(row?.modelHealth ?? null);
}

export async function resolveCustomerModelCandidates(
  input: ResolveModelCandidatesInput,
): Promise<ResolvedModelCandidates> {
  const health = await loadProviderModelHealth(input.userId, input.provider);
  if (health && health.rankedModels.length > 0) {
    return resolveCandidatesFromHealth(input.provider, health, input.preferredModelId);
  }
  return buildDefaultModelCandidates(input.provider, input.preferredModelId);
}

export async function ensureFreshProviderModelHealth(
  userId: string,
  provider: HandshakeProvider,
  traceId?: string,
): Promise<ProviderModelHealth | null> {
  const existing = await loadProviderModelHealth(userId, provider);
  const stale =
    !existing || Date.now() - Date.parse(existing.checkedAt) > MODEL_HEALTH_STALE_MS;

  if (!stale) return existing;

  const credentials = await getUserApiKeyCredentials(userId, provider);
  if (!credentials) return existing;

  try {
    return await refreshProviderModelHealth({
      userId,
      provider,
      apiKey: credentials.apiKey,
      customEndpointUrl: credentials.customEndpointUrl,
      traceId,
    });
  } catch {
    return existing;
  }
}

export async function recordModelRuntimeOutcome(input: {
  userId: string;
  provider: HandshakeProvider;
  modelId: string;
  ok: boolean;
  errorMessage?: string | null;
}): Promise<void> {
  const health = await loadProviderModelHealth(input.userId, input.provider);
  if (!health) return;

  const now = new Date().toISOString();
  const entry = health.entries[input.modelId] ?? {
    modelId: input.modelId,
    status: "healthy" as const,
    lastCheckedAt: now,
    probes: { text: true, structured: true },
  };

  if (input.ok) {
    entry.status = "healthy";
    entry.lastError = null;
    entry.cooldownUntil = null;
    entry.lastCheckedAt = now;
    if (!health.rankedModels.includes(input.modelId)) {
      health.rankedModels.unshift(input.modelId);
    }
    health.primaryModelId = input.modelId;
  } else {
    entry.status = "failed";
    entry.lastError = input.errorMessage?.slice(0, 240) ?? "runtime_failure";
    entry.cooldownUntil = buildFailedModelCooldownUntil();
    entry.lastCheckedAt = now;
    if (isModelSunsetError(input.errorMessage)) {
      entry.sunsetHint = true;
    }
    health.rankedModels = health.rankedModels.filter((modelId) => modelId !== input.modelId);
    if (health.primaryModelId === input.modelId) {
      health.primaryModelId = health.rankedModels[0] ?? null;
    }
  }

  health.entries[input.modelId] = entry;
  health.checkedAt = now;

  await prisma.userApiKey.update({
    where: { userId_provider: { userId: input.userId, provider: input.provider } },
    data: { modelHealth: health },
  });
}
