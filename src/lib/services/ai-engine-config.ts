/** `app_config` row key for AI engine runtime (model, quotas — not secrets). */
export const AI_ENGINE_CONFIG_KEY = "aiEngine";

export type AiEngineQuotaLimits = {
  dailyEnhancements: number;
  dailyCalls: number;
};

export type AiEngineSystemQuotaLimits = AiEngineQuotaLimits & {
  /** When false, all AI routes use BYOK (customer) keys only. */
  enable: boolean;
};

export type AiEngineCustomerQuotaLimits = AiEngineQuotaLimits & {
  /** When true, BYOK users bypass daily enhancement/call counters. */
  aiDailyUnlimited: boolean;
};

export type AiEngineConfig = {
  system: {
    /** Gemini model id for EasySubmit system AI. */
    modelId: string;
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

export const AI_ENGINE_DEFAULTS: AiEngineConfig = {
  system: {
    modelId: "gemini-2.5-flash-lite",
    maxKeySlots: 3,
  },
  quotas: {
    system: {
      enable: true,
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
    enable: typeof value.enable === "boolean" ? value.enable : fallback.enable,
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

  const modelId =
    typeof systemRaw.modelId === "string" && systemRaw.modelId.trim()
      ? systemRaw.modelId.trim()
      : AI_ENGINE_DEFAULTS.system.modelId;

  const maxKeySlots = Math.min(
    MAX_SLOT,
    Math.max(MIN_SLOT, parsePositiveInt(systemRaw.maxKeySlots, AI_ENGINE_DEFAULTS.system.maxKeySlots)),
  );

  return {
    system: { modelId, maxKeySlots },
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

export function isSystemAiEnabled(config: AiEngineConfig): boolean {
  return config.quotas.system.enable;
}

export function isCustomerQuotaUnlimited(config: AiEngineConfig): boolean {
  return config.quotas.customer.aiDailyUnlimited;
}

/** Effective BYOK enhancement limit (null when customer quota is unlimited). */
export function resolveCustomerEnhancementLimit(config: AiEngineConfig): number | null {
  if (isCustomerQuotaUnlimited(config)) return null;
  return config.customerDailyEnhancementCap;
}
