import { prisma } from "@/lib/prisma";
import { resolveExtensionApiBaseUrl } from "@/lib/extension/resolve-api-base-url";
import {
  EXTENSION_SITES_CONFIG_KEY,
  EXTENSION_SITES_DEFAULTS,
  parseExtensionSitesConfig,
  type ExtensionSitesConfig,
} from "@/src/lib/services/extension-sites-config";
import { isFeatureEnabled, FEATURE_FLAG_KEYS } from "@/src/lib/services/feature-flags-service";

export type ExtensionRuntimeConfig = ExtensionSitesConfig & {
  extensionGlobalSwitch: boolean;
  autoApplyEnabled: boolean;
  /** Prod PostHog apply-pipeline step events — dev always emits regardless. */
  applyPipelineStepAnalytics: boolean;
  apiBaseUrl: string;
};

export async function getExtensionRuntimeConfig(
  requestOrigin?: string | null,
): Promise<ExtensionRuntimeConfig> {
  const [row, extensionGlobalSwitch, autoApplyEnabled, applyPipelineStepAnalytics] =
    await Promise.all([
    prisma.appConfig.findUnique({
      where: { key: EXTENSION_SITES_CONFIG_KEY },
      select: { value: true },
    }),
    isFeatureEnabled(FEATURE_FLAG_KEYS.extensionGlobalSwitch),
    isFeatureEnabled(FEATURE_FLAG_KEYS.extensionAutoApply),
    isFeatureEnabled(FEATURE_FLAG_KEYS.extensionApplyPipelineStepAnalytics),
  ]);

  const sites = parseExtensionSitesConfig(row?.value ?? null);

  return {
    ...sites,
    extensionGlobalSwitch,
    autoApplyEnabled,
    applyPipelineStepAnalytics,
    apiBaseUrl: resolveExtensionApiBaseUrl(requestOrigin),
  };
}

export { EXTENSION_SITES_DEFAULTS, EXTENSION_SITES_CONFIG_KEY };
