/** `app_config` row key for AI engine runtime (model, quotas — not secrets). */
export const AI_ENGINE_CONFIG_KEY = "aiEngine";

export type AiEngineQuotaLimits = {
  dailyEnhancements: number;
  dailyCalls: number;
};

export type AiEngineSystemQuotaLimits = {
  /** Global daily OpenRouter `:free` call budget. */
  dailyTotalSystemCalls: number;
  /** Global daily system-enhance budget. */
  dailyTotalSystemEnhancements: number;
  /** Per-user daily system AI call cap. */
  dailyUserCalls: number;
  /** Per-user daily system enhance cap. */
  dailyUserEnhancements: number;
};

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
    /** Legacy single-provider hint — mixed pool uses per-slot providers. */
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
};

/** Seed/docs metadata for the `app_config.info` column on the aiEngine row. */
export const AI_ENGINE_CONFIG_INFO = {
  summary: "Runtime AI engine config for EasySubmit system AI and BYOK quotas.",
  fields: {
    enabled:
      "Top-level system pool switch. When false, system AI is unavailable and users must use BYOK.",
    "quotas.system.dailyTotalSystemCalls":
      "Global daily OpenRouter free-call budget. For a funded OpenRouter account, use 1000.",
    "quotas.system.dailyTotalSystemEnhancements":
      "Global daily system-enhance budget. Recommended 200 for about 2 calls per enhance plus retry headroom.",
    "quotas.system.dailyUserCalls": "Per-user daily system AI call cap.",
    "quotas.system.dailyUserEnhancements": "Per-user daily system enhance cap.",
    "system.maxKeySlots": "Number of system key slots loaded from system_api_keys.",
    "system.slot0":
      "OpenRouter funded free tier. Uses openrouter/free and must return a :free model.",
    "system.slot1":
      "DeepSeek paid overflow. Used only when OpenRouter free fails or is unhealthy.",
  },
  openRouter: {
    fundedFreeThresholdUsd: 10,
    configuredTopUpUsd: 11,
    freeRequestsPerDay: 1000,
    freeRequestsPerMinute: 20,
    freeOnlyGuard:
      "Use openrouter/free plus zero max_price and verify response.model ends with :free.",
  },
} as const;

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
    maxKeySlots: 2,
  },
  quotas: {
    system: {
      dailyTotalSystemCalls: 1000,
      dailyTotalSystemEnhancements: 200,
      dailyUserCalls: 20,
      dailyUserEnhancements: 5,
    },
    customer: {
      aiDailyUnlimited: true,
      dailyEnhancements: 50,
      dailyCalls: 200,
    },
  },
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

  const legacyEnhancements = parseQuotaInt(value.dailyEnhancements, -1);
  const legacyCalls = parseQuotaInt(value.dailyCalls, -1);

  return {
    dailyTotalSystemCalls: parseQuotaInt(
      value.dailyTotalSystemCalls,
      fallback.dailyTotalSystemCalls,
    ),
    dailyTotalSystemEnhancements: parseQuotaInt(
      value.dailyTotalSystemEnhancements,
      fallback.dailyTotalSystemEnhancements,
    ),
    dailyUserCalls: parseQuotaInt(
      value.dailyUserCalls,
      legacyCalls >= 0 ? legacyCalls : fallback.dailyUserCalls,
    ),
    dailyUserEnhancements: parseQuotaInt(
      value.dailyUserEnhancements,
      legacyEnhancements >= 0 ? legacyEnhancements : fallback.dailyUserEnhancements,
    ),
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
  return config.quotas.customer.dailyEnhancements;
}

/** System-pool model for JD structured extraction (`generateObject`). */
export function resolveJdExtractionSystemModel(config: AiEngineConfig): string {
  return (
    config.system.jdExtractionModelId.trim() ||
    AI_ENGINE_DEFAULTS.system.jdExtractionModelId
  );
}
