import { EXTENSION_STORE_URL } from "@/src/shared/brand";
import type { ExtensionPlatform, ExtensionRuntimeConfig } from "./types";

export const EXTENSION_RUNTIME_DEFAULTS: ExtensionRuntimeConfig = {
  extensionGlobalSwitch: true,
  jobCardEnabled: true,
  enabledPlatforms: ["linkedin", "indeed", "greenhouse", "workday", "generic"],
  genericFallbackEnabled: true,
  minConfidence: 55,
  apiBaseUrl: "http://localhost:3000",
  autoApplyUserSwitch: true,
  oneClickApplyPlatforms: ["workday"],
  autoApplyEnabled: true,
  aiEnabled: true,
  applyPipelineStepAnalytics: false,
  forceUpgradeUpdateUrl: EXTENSION_STORE_URL,
};

/** Merge API config with safe defaults so Workday/generic detection keeps working. */
export function mergeExtensionRuntimeConfig(
  partial?: Partial<ExtensionRuntimeConfig> | null,
): ExtensionRuntimeConfig {
  if (!partial) return { ...EXTENSION_RUNTIME_DEFAULTS };

  const enabledPlatforms: ExtensionPlatform[] =
    Array.isArray(partial.enabledPlatforms) && partial.enabledPlatforms.length > 0
      ? (Array.from(
          new Set<ExtensionPlatform>([...partial.enabledPlatforms, "workday", "generic"]),
        ) as ExtensionPlatform[])
      : EXTENSION_RUNTIME_DEFAULTS.enabledPlatforms;

  return {
    extensionGlobalSwitch:
      partial.extensionGlobalSwitch ?? EXTENSION_RUNTIME_DEFAULTS.extensionGlobalSwitch,
    jobCardEnabled: partial.jobCardEnabled ?? EXTENSION_RUNTIME_DEFAULTS.jobCardEnabled,
    enabledPlatforms,
    genericFallbackEnabled:
      partial.genericFallbackEnabled ?? EXTENSION_RUNTIME_DEFAULTS.genericFallbackEnabled,
    minConfidence: partial.minConfidence ?? EXTENSION_RUNTIME_DEFAULTS.minConfidence,
    apiBaseUrl: partial.apiBaseUrl ?? EXTENSION_RUNTIME_DEFAULTS.apiBaseUrl,
    autoApplyUserSwitch:
      partial.autoApplyUserSwitch ?? EXTENSION_RUNTIME_DEFAULTS.autoApplyUserSwitch,
    oneClickApplyPlatforms:
      partial.oneClickApplyPlatforms ?? EXTENSION_RUNTIME_DEFAULTS.oneClickApplyPlatforms,
    autoApplyEnabled: partial.autoApplyEnabled ?? EXTENSION_RUNTIME_DEFAULTS.autoApplyEnabled,
    customizeResume: partial.customizeResume ?? true,
    applicationProfile: partial.applicationProfile ?? null,
    connectedUser: partial.connectedUser ?? null,
    aiHealthError: partial.aiHealthError ?? null,
    systemQuotaExceeded: partial.systemQuotaExceeded ?? false,
    byokKeyInvalid: partial.byokKeyInvalid ?? false,
    aiEnabled: partial.aiEnabled ?? EXTENSION_RUNTIME_DEFAULTS.aiEnabled,
    forceUpgradeEnabled: partial.forceUpgradeEnabled ?? false,
    minExtensionVersion: partial.minExtensionVersion ?? null,
    forceUpgradeMessage: partial.forceUpgradeMessage ?? null,
    forceUpgradeUpdateUrl: partial.forceUpgradeUpdateUrl ?? EXTENSION_STORE_URL,
    applyPipelineStepAnalytics: partial.applyPipelineStepAnalytics ?? false,
  };
}
