/** `app_config` row key for AI engine runtime (model, quotas — not secrets). */
export const AI_ENGINE_CONFIG_KEY = "aiEngine";

export type AiEngineQuotaLimits = {
  dailyEnhancements: number;
  dailyCalls: number;
};

export type AiEngineSystemQuotaLimits = AiEngineQuotaLimits;

export type AiEngineCustomerQuotaLimits = AiEngineQuotaLimits & {
  /** When true, BYOK users bypass daily enhancement/call counters. */
  aiDailyUnlimited: boolean;
};

import {
  DEFAULT_SYSTEM_POOL_PROVIDER,
  parseSystemPoolProvider,
  resolveSystemJdExtractModel,
  resolveSystemResumeModel,
  type SystemPoolProvider,
} from "@/src/lib/ai/engine/system-model-defaults";

export type AiEngineConfig = {
  /** Admin flag: when false, system AI is unavailable (forces BYOK mode). */
  enabled: boolean;
  system: {
    /** System pool provider — `deepseek`, `openrouter` (GLM), or legacy `gemini`. */
    provider: SystemPoolProvider;
    /** Resume enhance model id for the configured system provider. */
    modelId: string;
    /** JD structured extract model id (utility tier when possible). */
    jdExtractionModelId: string;
    /** Max vaulted system key slots (0 … maxKeySlots-1). */
    maxKeySlots: number;
  };
  quotas: {
    system: AiEngineSystemQuotaLimits;
    customer: AiEngineCustomerQuotaLimits;
  };
  /** BYOK daily enhancement cap when `quotas.customer.aiDailyUnlimited` is false. */
  customerDailyEnhancementCap: number;
};

/** Default JD extract model for the default system provider (DeepSeek Flash). */
export const JD_EXTRACTION_SYSTEM_MODEL_DEFAULT = resolveSystemJdExtractModel(
  DEFAULT_SYSTEM_POOL_PROVIDER,
);

export const AI_ENGINE_DEFAULTS: AiEngineConfig = {
  enabled: true,
  system: {
    provider: DEFAULT_SYSTEM_POOL_PROVIDER,
    modelId: resolveSystemResumeModel(DEFAULT_SYSTEM_POOL_PROVIDER),
    jdExtractionModelId: JD_EXTRACTION_SYSTEM_MODEL_DEFAULT,
    maxKeySlots: 3,
  },
  quotas: {
    system: {
      dailyEnhancements: 5,
      dailyCalls: 20,
    },
    customer: {
      aiDailyUnlimited: true,
      dailyEnhancements: 50,
      dailyCalls: 200,
    },
  },
  customerDailyEnhancementCap: 50,
};

const MIN_SLOT = 1;
const MAX_SLOT = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.round(value);
}

function parseQuotaInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.round(value);
}

function parseSystemQuotaLimits(
  value: unknown,
  fallback: AiEngineSystemQuotaLimits,
): AiEngineSystemQuotaLimits {
  if (!isRecord(value)) return fallback;
  return {
    dailyEnhancements: parseQuotaInt(value.dailyEnhancements, fallback.dailyEnhancements),
    dailyCalls: parseQuotaInt(value.dailyCalls, fallback.dailyCalls),
  };
}

function parseCustomerQuotaLimits(
  value: unknown,
  fallback: AiEngineCustomerQuotaLimits,
): AiEngineCustomerQuotaLimits {
  if (!isRecord(value)) return fallback;
  return {
    aiDailyUnlimited:
      typeof value.aiDailyUnlimited === "boolean"
        ? value.aiDailyUnlimited
        : fallback.aiDailyUnlimited,
    dailyEnhancements: parseQuotaInt(value.dailyEnhancements, fallback.dailyEnhancements),
    dailyCalls: parseQuotaInt(value.dailyCalls, fallback.dailyCalls),
  };
}

export function parseAiEngineConfig(value: unknown): AiEngineConfig | null {
  if (!isRecord(value)) return null;

  const systemRaw = isRecord(value.system) ? value.system : {};
  const quotasRaw = isRecord(value.quotas) ? value.quotas : {};

  const enabled = typeof value.enabled === "boolean" ? value.enabled : AI_ENGINE_DEFAULTS.enabled;

  const provider = parseSystemPoolProvider(systemRaw.provider, AI_ENGINE_DEFAULTS.system.provider);

  const modelId = resolveSystemResumeModel(
    provider,
    typeof systemRaw.modelId === "string" ? systemRaw.modelId : undefined,
  );

  const jdExtractionModelId = resolveSystemJdExtractModel(
    provider,
    typeof systemRaw.jdExtractionModelId === "string" ? systemRaw.jdExtractionModelId : undefined,
  );

  const maxKeySlots = Math.min(
    MAX_SLOT,
    Math.max(MIN_SLOT, parsePositiveInt(systemRaw.maxKeySlots, AI_ENGINE_DEFAULTS.system.maxKeySlots)),
  );

  return {
    enabled,
    system: { provider, modelId, jdExtractionModelId, maxKeySlots },
    quotas: {
      system: parseSystemQuotaLimits(quotasRaw.system, AI_ENGINE_DEFAULTS.quotas.system),
      customer: parseCustomerQuotaLimits(quotasRaw.customer, AI_ENGINE_DEFAULTS.quotas.customer),
    },
    customerDailyEnhancementCap: parsePositiveInt(
      value.customerDailyEnhancementCap,
      AI_ENGINE_DEFAULTS.customerDailyEnhancementCap,
    ),
  };
}

export function resolveAiEngineConfig(value: unknown): AiEngineConfig {
  return parseAiEngineConfig(value) ?? AI_ENGINE_DEFAULTS;
}

export function isCustomerQuotaUnlimited(config: AiEngineConfig): boolean {
  return config.quotas.customer.aiDailyUnlimited;
}

/** Effective BYOK enhancement limit (null when customer quota is unlimited). */
export function resolveCustomerEnhancementLimit(config: AiEngineConfig): number | null {
  if (isCustomerQuotaUnlimited(config)) return null;
  return config.customerDailyEnhancementCap;
}

/** System-pool model for JD structured extraction (`generateObject`). */
export function resolveJdExtractionSystemModel(config: AiEngineConfig): string {
  return (
    config.system.jdExtractionModelId.trim() ||
    AI_ENGINE_DEFAULTS.system.jdExtractionModelId
  );
}
