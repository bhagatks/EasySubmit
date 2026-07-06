import type { AiProvider } from "@/src/lib/config/app.config";
import {
  type HandshakeProvider,
  isHandshakeProvider,
} from "@/src/lib/config/career-grade-models";
import { GEMINI_JD_EXTRACT_MODEL } from "@/src/lib/ai/engine/gemini-resilience";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";
import {
  AI_ENGINE_DEFAULTS,
  resolveJdExtractionSystemModel,
  type AiEngineConfig,
} from "@/src/lib/services/ai-engine-config";
import { resolveByokTaskRoute } from "@/lib/ai/model-health/resolve-byok-task-route";
import { loadProviderModelHealth } from "@/lib/ai/model-health/resolve-model-candidates";

/** Hard cap for JD structured extract — must stay under one minute. */
export const JD_EXTRACTION_TIMEOUT_MS = 60_000;

/** Fast utility models for BYOK JD extract (never resume-grade Opus/O1). */
export const JD_EXTRACTION_CUSTOMER_DEFAULTS: Partial<Record<HandshakeProvider, string>> = {
  gemini: GEMINI_JD_EXTRACT_MODEL,
  anthropic: "claude-3-5-haiku-20241022",
  openai: "gpt-4o-mini",
  groq: "llama-3.1-8b-instant",
  deepseek: "deepseek-v4-flash",
  openrouter: "openai/gpt-4o-mini",
  zai: "glm-4-flash",
  deepinfra: "meta-llama/Llama-3.3-70B-Instruct",
  xai: "grok-3-mini",
  siliconflow: "Qwen/Qwen3-32B",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  mistral: "mistral-small-latest",
};

const JD_SLOW_MODEL_PATTERN =
  /opus|o1(-|$)|o3(-|$)|reasoner|thinking|preview.*pro|claude-3-opus/i;

const JD_FAST_MODEL_PATTERN =
  /haiku|flash-lite|mini|8b-instant|instant|deepseek-v4-flash|deepseek-chat(?!.*reasoner)/i;

export function isJdExtractionSuitableModel(
  provider: AiProvider,
  modelId: string,
): boolean {
  const normalized = modelId.trim().toLowerCase();
  if (!normalized) return false;
  if (JD_SLOW_MODEL_PATTERN.test(normalized)) return false;

  if (provider === "gemini") {
    return normalized.includes("flash");
  }
  if (provider === "anthropic") {
    return normalized.includes("haiku") || normalized.includes("sonnet");
  }
  if (provider === "openai") {
    return normalized.includes("mini") || normalized === "gpt-4o";
  }
  if (provider === "deepseek") {
    return normalized === "deepseek-v4-flash" || normalized === "deepseek-chat";
  }
  if (provider === "groq") {
    return normalized.includes("llama") || normalized.includes("mixtral");
  }

  return JD_FAST_MODEL_PATTERN.test(normalized);
}

/**
 * Health-ranked candidates, JD-suitable only, preserving health order.
 * Fast utility models (haiku/mini/…) float to the front; slower-but-suitable
 * models (sonnet, gpt-4o) keep their relative health order behind them.
 */
export function rankJdExtractionCandidates(
  provider: AiProvider,
  modelIds: string[],
): string[] {
  const seen = new Set<string>();
  const suitable = modelIds.filter((modelId) => {
    const key = modelId.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return isJdExtractionSuitableModel(provider, modelId);
  });
  const fast = suitable.filter((m) => JD_FAST_MODEL_PATTERN.test(m.toLowerCase()));
  const rest = suitable.filter((m) => !JD_FAST_MODEL_PATTERN.test(m.toLowerCase()));
  return [...fast, ...rest];
}

function isModelCooldownActive(cooldownUntil: string | null | undefined, now = Date.now()): boolean {
  if (!cooldownUntil) return false;
  const until = Date.parse(cooldownUntil);
  return Number.isFinite(until) && until > now;
}

function dedupeModelIds(modelIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const modelId of modelIds) {
    const trimmed = modelId.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function resolveJdExtractionCustomerCandidates(
  provider: AiProvider,
  customerEnhanceModelId: string,
  systemJdModelId: string,
  modelCandidates: string[] = [],
  fallbackCandidates: string[] = modelCandidates,
): string[] {
  const providerDefault =
    (isHandshakeProvider(provider) ? JD_EXTRACTION_CUSTOMER_DEFAULTS[provider] : undefined) ??
    systemJdModelId;

  // Gemini BYOK enhance flash models are unreliable for generateObject — flash-lite first.
  if (provider === "gemini") {
    return dedupeModelIds([
      providerDefault,
      ...modelCandidates,
      ...fallbackCandidates,
      customerEnhanceModelId,
    ]);
  }

  const utilityPool = rankJdExtractionCandidates(provider, modelCandidates);
  const slowFallback = dedupeModelIds(fallbackCandidates).filter(
    (modelId) => !isJdExtractionSuitableModel(provider, modelId),
  );

  const chain = dedupeModelIds([
    ...utilityPool,
    ...slowFallback,
    customerEnhanceModelId,
  ]);

  if (chain.length > 0) {
    return chain;
  }

  return [providerDefault];
}

export function resolveJdExtractionCustomerModel(
  provider: AiProvider,
  customerEnhanceModelId: string,
  systemJdModelId: string,
  modelCandidates: string[] = [],
): string {
  return resolveJdExtractionCustomerCandidates(
    provider,
    customerEnhanceModelId,
    systemJdModelId,
    modelCandidates,
  )[0]!;
}

export function resolveJdExtractionCustomerRoute(
  route: Extract<ResolvedAiRoute, { mode: "customer" }>,
  systemJdModelId: string,
  input?: {
    structuredCandidates?: string[];
    fallbackCandidates?: string[];
    /** When true, never fall back to unprobed `modelCandidates` for the utility tier. */
    structuredProbeApplied?: boolean;
  },
): Extract<ResolvedAiRoute, { mode: "customer" }> {
  const structured = input?.structuredProbeApplied
    ? (input.structuredCandidates ?? [])
    : input?.structuredCandidates?.length
      ? input.structuredCandidates
      : route.modelCandidates;
  const fallback = input?.fallbackCandidates ?? route.modelCandidates;

  const candidates = resolveJdExtractionCustomerCandidates(
    route.provider,
    route.modelId,
    systemJdModelId,
    structured,
    fallback,
  );

  return {
    ...route,
    modelId: candidates[0]!,
    modelCandidates: candidates,
  };
}

/** Models on the vault key that passed structured `generateObject` probes and are not in cooldown. */
export function filterStructuredHealthyModels(
  rankedModels: string[],
  entries: Record<string, { status: string; probes: { structured: boolean }; cooldownUntil?: string | null }>,
  now = Date.now(),
): string[] {
  return rankedModels.filter((modelId) => {
    const entry = entries[modelId];
    if (!entry || entry.status !== "healthy" || !entry.probes.structured) return false;
    return !isModelCooldownActive(entry.cooldownUntil, now);
  });
}

/**
 * JD extract tries cheaper utility models first (fast tier, structured-probe verified),
 * then falls back to resume-grade models on the same key via `modelCandidates`.
 */
export async function resolveJdExtractionExecutionRoute(
  route: ResolvedAiRoute,
  input: {
    userId?: string | null;
    aiEngine?: AiEngineConfig;
  } = {},
): Promise<ResolvedAiRoute> {
  const engine = input.aiEngine ?? AI_ENGINE_DEFAULTS;
  const systemJdModelId = resolveJdExtractionSystemModel(engine);

  if (route.mode === "system") {
    return { mode: "system", provider: route.provider, modelId: systemJdModelId };
  }

  if (input.userId) {
    const health = await loadProviderModelHealth(input.userId, route.provider);
    if (health?.rankedModels.length) {
      return resolveByokTaskRoute(route, "cheap", { userId: input.userId });
    }
  }

  let structuredCandidates: string[] | undefined;
  let structuredProbeApplied = false;
  if (input.userId) {
    const { loadProviderModelHealth } = await import(
      "@/lib/ai/model-health/resolve-model-candidates"
    );
    const health = await loadProviderModelHealth(input.userId, route.provider);
    if (health?.rankedModels.length) {
      structuredProbeApplied = true;
      structuredCandidates = filterStructuredHealthyModels(health.rankedModels, health.entries);
    }
  }

  return resolveJdExtractionCustomerRoute(route, systemJdModelId, {
    structuredCandidates,
    structuredProbeApplied,
    fallbackCandidates: route.modelCandidates,
  });
}
