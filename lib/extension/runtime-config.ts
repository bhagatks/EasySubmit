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
  apiBaseUrl: string;
};

export async function getExtensionRuntimeConfig(
  requestOrigin?: string | null,
): Promise<ExtensionRuntimeConfig> {
  const [row, extensionGlobalSwitch, autoApplyEnabled] = await Promise.all([
    prisma.appConfig.findUnique({
      where: { key: EXTENSION_SITES_CONFIG_KEY },
      select: { value: true },
    }),
    isFeatureEnabled(FEATURE_FLAG_KEYS.extensionGlobalSwitch),
    isFeatureEnabled(FEATURE_FLAG_KEYS.extensionAutoApply),
  ]);

  const sites = parseExtensionSitesConfig(row?.value ?? null);

  return {
    ...sites,
    extensionGlobalSwitch,
    autoApplyEnabled,
    apiBaseUrl: resolveExtensionApiBaseUrl(requestOrigin),
  };
}

export { EXTENSION_SITES_DEFAULTS, EXTENSION_SITES_CONFIG_KEY };
