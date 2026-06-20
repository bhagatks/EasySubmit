export type ModelPricingRates = {
  inputPer1k: number;
  outputPer1k: number;
};

/** `app_config.ai_pricing_map` — USD per 1K tokens, keyed by model id or substring patterns. */
export type AiPricingMap = {
  default: ModelPricingRates;
  models: Record<string, ModelPricingRates>;
  patterns: Array<ModelPricingRates & { match: string }>;
};

export const AI_PRICING_MAP_KEY = "ai_pricing_map";

/** Built-in fallback when `ai_pricing_map` is missing or invalid in the database. */
export const AI_PRICING_MAP_DEFAULT: AiPricingMap = {
  default: { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  models: {
    "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
    "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.01 },
    "claude-3-5-haiku-latest": { inputPer1k: 0.0008, outputPer1k: 0.004 },
    "claude-3-5-sonnet-latest": { inputPer1k: 0.003, outputPer1k: 0.015 },
    "gemini-2.0-flash": { inputPer1k: 0.0001, outputPer1k: 0.0004 },
    "gemini-2.5-flash": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
    "deepseek-chat": { inputPer1k: 0.00014, outputPer1k: 0.00028 },
  },
  patterns: [
    { match: "claude", inputPer1k: 0.003, outputPer1k: 0.015 },
    { match: "gemini", inputPer1k: 0.0001, outputPer1k: 0.0004 },
    { match: "gpt-4o", inputPer1k: 0.0025, outputPer1k: 0.01 },
    { match: "deepseek", inputPer1k: 0.00014, outputPer1k: 0.00028 },
    { match: "llama", inputPer1k: 0.00005, outputPer1k: 0.00008 },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRate(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function parseModelRates(value: unknown): ModelPricingRates | null {
  if (!isRecord(value)) return null;

  const inputPer1k = parseRate(value.inputPer1k);
  const outputPer1k = parseRate(value.outputPer1k);

  if (inputPer1k === null || outputPer1k === null) return null;

  return { inputPer1k, outputPer1k };
}

/** Parse and validate `app_config.ai_pricing_map` JSON. */
export function parseAiPricingMap(value: unknown): AiPricingMap | null {
  if (!isRecord(value)) return null;

  const defaultRates = parseModelRates(value.default);
  if (!defaultRates) return null;

  const models: Record<string, ModelPricingRates> = {};
  if (isRecord(value.models)) {
    for (const [modelId, rates] of Object.entries(value.models)) {
      const parsed = parseModelRates(rates);
      if (parsed) {
        models[modelId.trim().toLowerCase()] = parsed;
      }
    }
  }

  const patterns: AiPricingMap["patterns"] = [];
  if (Array.isArray(value.patterns)) {
    for (const entry of value.patterns) {
      if (!isRecord(entry)) continue;
      const match = typeof entry.match === "string" ? entry.match.trim() : "";
      const rates = parseModelRates(entry);
      if (match && rates) {
        patterns.push({ match, ...rates });
      }
    }
  }

  return { default: defaultRates, models, patterns };
}

/** Resolve per-1K token rates for a provider model id. */
export function resolveModelPricing(
  modelId: string,
  map: AiPricingMap = AI_PRICING_MAP_DEFAULT,
): ModelPricingRates {
  const id = modelId.trim().toLowerCase();
  if (!id) return map.default;

  const exact = map.models[id];
  if (exact) return exact;

  for (const pattern of map.patterns) {
    if (id.includes(pattern.match.toLowerCase())) {
      return {
        inputPer1k: pattern.inputPer1k,
        outputPer1k: pattern.outputPer1k,
      };
    }
  }

  return map.default;
}
