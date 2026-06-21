import { prisma } from "@/lib/prisma";
import {
  AI_PRICING_MAP_DEFAULT,
  AI_PRICING_MAP_KEY,
  parseAiPricingMap,
  type AiPricingMap,
} from "@/src/lib/services/ai-pricing-map";
import {
  DATA_REFRESH_SAFETY_DEFAULT,
  type DataRefreshConfig,
  type RefreshIntervalMinutes,
} from "@/src/lib/services/config-shared";
import {
  AI_ENGINE_CONFIG_KEY,
  AI_ENGINE_DEFAULTS,
  parseAiEngineConfig,
  type AiEngineConfig,
} from "@/src/lib/services/ai-engine-config";
import {
  ENHANCE_WITH_AI_CONFIG_KEY,
  ENHANCE_WITH_AI_SAFETY_DEFAULT,
  parseEnhanceWithAiConfig,
  type EnhanceWithAiConfig,
} from "@/src/lib/services/enhance-with-ai-config";

export type { AiPricingMap } from "@/src/lib/services/ai-pricing-map";
export type { DataRefreshConfig, RefreshIntervalMinutes };
export type { EnhanceWithAiConfig } from "@/src/lib/services/enhance-with-ai-config";
export type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
export {
  AI_ENGINE_CONFIG_KEY,
  AI_ENGINE_DEFAULTS,
} from "@/src/lib/services/ai-engine-config";
export {
  ENHANCE_WITH_AI_CONFIG_KEY,
  ENHANCE_WITH_AI_SAFETY_DEFAULT,
  DEFAULT_ENHANCE_WITH_AI_TIMEOUT_MS,
} from "@/src/lib/services/enhance-with-ai-config";
export { DATA_REFRESH_SAFETY_DEFAULT, AI_PRICING_MAP_DEFAULT, AI_PRICING_MAP_KEY };

export interface AiConfigRecord {
  defaultProvider: string;
  discoveryEnabled: boolean;
  lastGlobalSync: string;
}

/** Runtime snapshot of seeded `app_config` namespaces used by the engine. */
export interface AppConfigSnapshot {
  dataRefresh: DataRefreshConfig;
  aiConfig: AiConfigRecord | null;
  aiPricingMap: AiPricingMap;
  enhanceWithAi: EnhanceWithAiConfig;
  aiEngine: AiEngineConfig;
}

const DATA_REFRESH_KEY = "dataRefresh";
const AI_CONFIG_KEY = "aiConfig";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRefreshIntervalMinutes(value: unknown): RefreshIntervalMinutes | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function parseDataRefreshConfig(value: unknown): DataRefreshConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const interval = parseRefreshIntervalMinutes(value.interval);
  if (interval === null) {
    return null;
  }

  const config: DataRefreshConfig = { interval };

  const aiModelsUpdate = parseRefreshIntervalMinutes(value.aiModelsUpdate);
  if (aiModelsUpdate !== null) {
    config.aiModelsUpdate = aiModelsUpdate;
  }

  if (typeof value.description === "string" && value.description.trim()) {
    config.description = value.description.trim();
  }

  return config;
}

function parseAiConfigRecord(value: unknown): AiConfigRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.defaultProvider !== "string" || !value.defaultProvider.trim()) {
    return null;
  }

  if (typeof value.discoveryEnabled !== "boolean") {
    return null;
  }

  if (typeof value.lastGlobalSync !== "string" || !value.lastGlobalSync.trim()) {
    return null;
  }

  return {
    defaultProvider: value.defaultProvider.trim(),
    discoveryEnabled: value.discoveryEnabled,
    lastGlobalSync: value.lastGlobalSync.trim(),
  };
}

/**
 * Loads global `app_config` rows for the engine.
 * Falls back to `{ interval: 1440 }` when `dataRefresh` is missing or invalid.
 */
export async function getAppConfig(): Promise<AppConfigSnapshot>;
export async function getAppConfig(key: "dataRefresh"): Promise<DataRefreshConfig>;
export async function getAppConfig(key: "aiConfig"): Promise<AiConfigRecord | null>;
export async function getAppConfig(key: "ai_pricing_map"): Promise<AiPricingMap>;
export async function getAppConfig(key: "enhanceWithAi"): Promise<EnhanceWithAiConfig>;
export async function getAppConfig(key: "aiEngine"): Promise<AiEngineConfig>;
export async function getAppConfig(
  key?: "dataRefresh" | "aiConfig" | "ai_pricing_map" | "enhanceWithAi" | "aiEngine",
): Promise<
  | AppConfigSnapshot
  | DataRefreshConfig
  | AiConfigRecord
  | null
  | AiPricingMap
  | EnhanceWithAiConfig
  | AiEngineConfig
> {
  const snapshot = await loadAppConfigSnapshot();

  if (key === "dataRefresh") {
    return snapshot.dataRefresh;
  }

  if (key === "aiConfig") {
    return snapshot.aiConfig;
  }

  if (key === "ai_pricing_map") {
    return snapshot.aiPricingMap;
  }

  if (key === "enhanceWithAi") {
    return snapshot.enhanceWithAi;
  }

  if (key === "aiEngine") {
    return snapshot.aiEngine;
  }

  return snapshot;
}

async function loadAppConfigSnapshot(): Promise<AppConfigSnapshot> {
  const rows = await prisma.appConfig.findMany({
    where: {
      key: {
        in: [
          DATA_REFRESH_KEY,
          AI_CONFIG_KEY,
          AI_PRICING_MAP_KEY,
          ENHANCE_WITH_AI_CONFIG_KEY,
          AI_ENGINE_CONFIG_KEY,
        ],
      },
    },
    select: {
      key: true,
      value: true,
    },
  });

  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  const dataRefresh =
    parseDataRefreshConfig(byKey.get(DATA_REFRESH_KEY)) ?? DATA_REFRESH_SAFETY_DEFAULT;

  const aiConfig = parseAiConfigRecord(byKey.get(AI_CONFIG_KEY));
  const aiPricingMap =
    parseAiPricingMap(byKey.get(AI_PRICING_MAP_KEY)) ?? AI_PRICING_MAP_DEFAULT;

  const enhanceWithAi =
    parseEnhanceWithAiConfig(byKey.get(ENHANCE_WITH_AI_CONFIG_KEY)) ??
    ENHANCE_WITH_AI_SAFETY_DEFAULT;

  const aiEngine =
    parseAiEngineConfig(byKey.get(AI_ENGINE_CONFIG_KEY)) ?? AI_ENGINE_DEFAULTS;

  return {
    dataRefresh,
    aiConfig,
    aiPricingMap,
    enhanceWithAi,
    aiEngine,
  };
}
