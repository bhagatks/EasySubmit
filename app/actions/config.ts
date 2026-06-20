"use server";

import {
  getAppConfig,
  type AiPricingMap,
  type AiConfigRecord,
  type AppConfigSnapshot,
  type DataRefreshConfig,
} from "@/src/lib/services/config-service";

export type AppConfigKey = "dataRefresh" | "aiConfig" | "ai_pricing_map";

/** Fetch a single `app_config` namespace by key. */
export async function fetchAppConfigValue<K extends AppConfigKey>(
  key: K,
): Promise<
  K extends "dataRefresh"
    ? DataRefreshConfig
    : K extends "aiConfig"
      ? AiConfigRecord | null
      : AiPricingMap
> {
  if (key === "dataRefresh") {
    return (await getAppConfig("dataRefresh")) as never;
  }

  if (key === "aiConfig") {
    return (await getAppConfig("aiConfig")) as never;
  }

  return (await getAppConfig("ai_pricing_map")) as never;
}

/** Client-safe fetch of `app_config.dataRefresh` (interval in minutes). */
export async function fetchDataRefreshConfig(): Promise<DataRefreshConfig> {
  return getAppConfig("dataRefresh");
}

/** BYOK spend rates — update `app_config.ai_pricing_map` to change dashboard $/token math. */
export async function fetchAiPricingMap(): Promise<AiPricingMap> {
  return getAppConfig("ai_pricing_map");
}

/** Full engine config snapshot (data refresh, AI defaults, pricing map). */
export async function fetchAppConfigSnapshot(): Promise<AppConfigSnapshot> {
  return getAppConfig();
}
