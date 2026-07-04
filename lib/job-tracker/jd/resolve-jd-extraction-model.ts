import type { AiProvider } from "@/src/lib/config/app.config";
import {
  type HandshakeProvider,
  isHandshakeProvider,
} from "@/src/lib/config/career-grade-models";
import { GEMINI_JD_EXTRACT_MODEL } from "@/src/lib/ai/engine/gemini-resilience";
import type { ResolvedAiRoute } from "@/src/lib/ai/engine/router";

/**
 * @deprecated JD extract uses the same `ResolvedAiRoute` as resume enhance.
 * Legacy helpers for ranking fast utility models — not used by `jdExtractionRoute` anymore.
 */
export const JD_EXTRACTION_TIMEOUT_MS = 60_000;

/** Fast utility models for BYOK JD extract (never resume-grade Opus/O1). */
export const JD_EXTRACTION_CUSTOMER_DEFAULTS: Record<HandshakeProvider, string> = {
  gemini: GEMINI_JD_EXTRACT_MODEL,
  anthropic: "claude-3-5-haiku-20241022",
  openai: "gpt-4o-mini",
  groq: "llama-3.1-8b-instant",
  deepseek: "deepseek-chat",
  openrouter: "openai/gpt-4o-mini",
};

const JD_SLOW_MODEL_PATTERN =
  /opus|o1(-|$)|o3(-|$)|reasoner|thinking|preview.*pro|claude-3-opus/i;

const JD_FAST_MODEL_PATTERN =
  /haiku|flash-lite|mini|8b-instant|instant|deepseek-chat(?!.*reasoner)/i;

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
    return normalized === "deepseek-chat";
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

export function resolveJdExtractionCustomerCandidates(
  provider: AiProvider,
  customerEnhanceModelId: string,
  systemJdModelId: string,
  modelCandidates: string[] = [],
): string[] {
  const providerDefault = isHandshakeProvider(provider)
    ? JD_EXTRACTION_CUSTOMER_DEFAULTS[provider]
    : systemJdModelId;

  // Gemini BYOK enhance flash models are unreliable for generateObject — always flash-lite.
  if (provider === "gemini") {
    return [providerDefault];
  }

  // Prefer models verified on the account (health-ranked) — a hard-coded
  // default can 404 when the key has no access to it (e.g. Haiku on some
  // Anthropic accounts). Keep the default as a last-resort fallback.
  const verified = rankJdExtractionCandidates(provider, [
    ...modelCandidates,
    customerEnhanceModelId,
  ]);
  if (verified.length > 0) {
    return verified.some((m) => m.toLowerCase() === providerDefault.toLowerCase())
      ? verified
      : [...verified, providerDefault];
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
): Extract<ResolvedAiRoute, { mode: "customer" }> {
  const candidates = resolveJdExtractionCustomerCandidates(
    route.provider,
    route.modelId,
    systemJdModelId,
    route.modelCandidates,
  );

  return {
    ...route,
    modelId: candidates[0]!,
    modelCandidates: candidates,
  };
}
