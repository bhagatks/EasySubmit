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
import {
  ENHANCE_DIAGNOSTICS_CONFIG_KEY,
  ENHANCE_DIAGNOSTICS_DEFAULTS,
  resolveEnhanceDiagnosticsConfig,
  type EnhanceDiagnosticsConfig,
} from "@/src/lib/services/enhance-diagnostics-config";
import {
  LEGAL_DOCUMENTS_CONFIG_KEY,
  LEGAL_DOCUMENTS_DEFAULTS,
  parseLegalDocumentsConfig,
  type LegalDocumentsConfig,
} from "@/src/lib/services/legal-documents-config";
import {
  RESUME_PROFILES_CONFIG_KEY,
  RESUME_PROFILES_DEFAULTS,
  parseResumeProfilesConfig,
  type ResumeProfilesConfig,
} from "@/src/lib/services/resume-profiles-config";
import {
  SUBSCRIPTION_CONFIG_KEY,
  SUBSCRIPTION_CONFIG_DEFAULTS,
  parseSubscriptionConfig,
  type SubscriptionConfig,
} from "@/src/lib/services/subscription-config";
import {
  EXTENSION_INSTALL_PROMPT_CONFIG_KEY,
  EXTENSION_INSTALL_PROMPT_DEFAULTS,
  resolveExtensionInstallPromptConfig,
  type ExtensionInstallPromptConfig,
} from "@/src/lib/services/extension-install-prompt-config";
import {
  DASHBOARD_TUTORIAL_VIDEOS_CONFIG_KEY,
  DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS,
  resolveDashboardTutorialVideosConfig,
  type DashboardTutorialVideosConfig,
} from "@/src/lib/services/dashboard-tutorial-videos-config";

export type { AiPricingMap } from "@/src/lib/services/ai-pricing-map";
export type { DataRefreshConfig, RefreshIntervalMinutes };
export type { EnhanceWithAiConfig } from "@/src/lib/services/enhance-with-ai-config";
export type { EnhanceDiagnosticsConfig } from "@/src/lib/services/enhance-diagnostics-config";
export {
  ENHANCE_DIAGNOSTICS_CONFIG_KEY,
  ENHANCE_DIAGNOSTICS_DEFAULTS,
} from "@/src/lib/services/enhance-diagnostics-config";
export type { AiEngineConfig } from "@/src/lib/services/ai-engine-config";
export type { LegalDocumentsConfig } from "@/src/lib/services/legal-documents-config";
export type { ResumeProfilesConfig } from "@/src/lib/services/resume-profiles-config";
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
export {
  LEGAL_DOCUMENTS_CONFIG_KEY,
  LEGAL_DOCUMENTS_DEFAULTS,
} from "@/src/lib/services/legal-documents-config";
export {
  RESUME_PROFILES_CONFIG_KEY,
  RESUME_PROFILES_DEFAULTS,
} from "@/src/lib/services/resume-profiles-config";
export {
  SUBSCRIPTION_CONFIG_KEY,
  SUBSCRIPTION_CONFIG_DEFAULTS,
  SUBSCRIPTION_PLAN_IDS,
  SUBSCRIPTION_STATUSES,
  isSubscribed,
  type SubscriptionConfig,
  type SubscriptionPlanId,
  type SubscriptionPlanConfig,
  type SubscriptionStatus,
} from "@/src/lib/services/subscription-config";
export type { ExtensionInstallPromptConfig } from "@/src/lib/services/extension-install-prompt-config";
export {
  EXTENSION_INSTALL_PROMPT_CONFIG_KEY,
  EXTENSION_INSTALL_PROMPT_DEFAULTS,
} from "@/src/lib/services/extension-install-prompt-config";
export type { DashboardTutorialVideosConfig } from "@/src/lib/services/dashboard-tutorial-videos-config";
export {
  DASHBOARD_TUTORIAL_VIDEOS_CONFIG_KEY,
  DASHBOARD_TUTORIAL_VIDEOS_DEFAULTS,
} from "@/src/lib/services/dashboard-tutorial-videos-config";

/** Runtime snapshot of seeded `app_config` namespaces used by the engine. */
export interface AppConfigSnapshot {
  dataRefresh: DataRefreshConfig;
  aiPricingMap: AiPricingMap;
  enhanceWithAi: EnhanceWithAiConfig;
  enhanceDiagnostics: EnhanceDiagnosticsConfig;
  aiEngine: AiEngineConfig;
  resumeProfiles: ResumeProfilesConfig;
  legalDocuments: LegalDocumentsConfig;
  subscriptions: SubscriptionConfig;
  extensionInstallPrompt: ExtensionInstallPromptConfig;
  dashboardTutorialVideos: DashboardTutorialVideosConfig;
}

const DATA_REFRESH_KEY = "dataRefresh";

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

/**
 * Loads global `app_config` rows for the engine.
 * Falls back to `{ interval: 1440 }` when `dataRefresh` is missing or invalid.
 */
export async function getAppConfig(): Promise<AppConfigSnapshot>;
export async function getAppConfig(key: "dataRefresh"): Promise<DataRefreshConfig>;
export async function getAppConfig(key: "ai_pricing_map"): Promise<AiPricingMap>;
export async function getAppConfig(key: "enhanceWithAi"): Promise<EnhanceWithAiConfig>;
export async function getAppConfig(key: "enhanceDiagnostics"): Promise<EnhanceDiagnosticsConfig>;
export async function getAppConfig(key: "aiEngine"): Promise<AiEngineConfig>;
export async function getAppConfig(key: "resumeProfiles"): Promise<ResumeProfilesConfig>;
export async function getAppConfig(key: "legalDocuments"): Promise<LegalDocumentsConfig>;
export async function getAppConfig(key: "subscriptions"): Promise<SubscriptionConfig>;
export async function getAppConfig(
  key: "extensionInstallPrompt",
): Promise<ExtensionInstallPromptConfig>;
export async function getAppConfig(
  key: "dashboardTutorialVideos",
): Promise<DashboardTutorialVideosConfig>;
export async function getAppConfig(
  key?:
    | "dataRefresh"
    | "ai_pricing_map"
    | "enhanceWithAi"
    | "enhanceDiagnostics"
    | "aiEngine"
    | "resumeProfiles"
    | "legalDocuments"
    | "subscriptions"
    | "extensionInstallPrompt"
    | "dashboardTutorialVideos",
): Promise<
  | AppConfigSnapshot
  | DataRefreshConfig
  | AiPricingMap
  | EnhanceWithAiConfig
  | EnhanceDiagnosticsConfig
  | AiEngineConfig
  | ResumeProfilesConfig
  | LegalDocumentsConfig
  | SubscriptionConfig
  | ExtensionInstallPromptConfig
  | DashboardTutorialVideosConfig
> {
  const snapshot = await loadAppConfigSnapshot();

  if (key === "dataRefresh") {
    return snapshot.dataRefresh;
  }

  if (key === "ai_pricing_map") {
    return snapshot.aiPricingMap;
  }

  if (key === "enhanceWithAi") {
    return snapshot.enhanceWithAi;
  }

  if (key === "enhanceDiagnostics") {
    return snapshot.enhanceDiagnostics;
  }

  if (key === "aiEngine") {
    return snapshot.aiEngine;
  }

  if (key === "resumeProfiles") {
    return snapshot.resumeProfiles;
  }

  if (key === "legalDocuments") {
    return snapshot.legalDocuments;
  }

  if (key === "subscriptions") {
    return snapshot.subscriptions;
  }

  if (key === "extensionInstallPrompt") {
    return snapshot.extensionInstallPrompt;
  }

  if (key === "dashboardTutorialVideos") {
    return snapshot.dashboardTutorialVideos;
  }

  return snapshot;
}

async function loadAppConfigSnapshot(): Promise<AppConfigSnapshot> {
  const rows = await prisma.appConfig.findMany({
    where: {
      key: {
        in: [
          DATA_REFRESH_KEY,
          AI_PRICING_MAP_KEY,
          ENHANCE_WITH_AI_CONFIG_KEY,
          ENHANCE_DIAGNOSTICS_CONFIG_KEY,
          AI_ENGINE_CONFIG_KEY,
          RESUME_PROFILES_CONFIG_KEY,
          LEGAL_DOCUMENTS_CONFIG_KEY,
          SUBSCRIPTION_CONFIG_KEY,
          EXTENSION_INSTALL_PROMPT_CONFIG_KEY,
          DASHBOARD_TUTORIAL_VIDEOS_CONFIG_KEY,
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

  const aiPricingMap =
    parseAiPricingMap(byKey.get(AI_PRICING_MAP_KEY)) ?? AI_PRICING_MAP_DEFAULT;

  const enhanceWithAi =
    parseEnhanceWithAiConfig(byKey.get(ENHANCE_WITH_AI_CONFIG_KEY)) ??
    ENHANCE_WITH_AI_SAFETY_DEFAULT;

  const enhanceDiagnostics = resolveEnhanceDiagnosticsConfig(
    byKey.get(ENHANCE_DIAGNOSTICS_CONFIG_KEY),
  );

  const aiEngine =
    parseAiEngineConfig(byKey.get(AI_ENGINE_CONFIG_KEY)) ?? AI_ENGINE_DEFAULTS;

  const resumeProfiles =
    parseResumeProfilesConfig(byKey.get(RESUME_PROFILES_CONFIG_KEY)) ??
    RESUME_PROFILES_DEFAULTS;

  const legalDocuments =
    parseLegalDocumentsConfig(byKey.get(LEGAL_DOCUMENTS_CONFIG_KEY)) ??
    LEGAL_DOCUMENTS_DEFAULTS;

  const subscriptions = parseSubscriptionConfig(byKey.get(SUBSCRIPTION_CONFIG_KEY));

  const extensionInstallPrompt = resolveExtensionInstallPromptConfig(
    byKey.get(EXTENSION_INSTALL_PROMPT_CONFIG_KEY),
  );

  const dashboardTutorialVideos = resolveDashboardTutorialVideosConfig(
    byKey.get(DASHBOARD_TUTORIAL_VIDEOS_CONFIG_KEY),
  );

  return {
    dataRefresh,
    aiPricingMap,
    enhanceWithAi,
    enhanceDiagnostics,
    aiEngine,
    resumeProfiles,
    legalDocuments,
    subscriptions,
    extensionInstallPrompt,
    dashboardTutorialVideos,
  };
}
