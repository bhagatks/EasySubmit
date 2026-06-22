export const EXTENSION_SITES_CONFIG_KEY = "extensionSites";

export type ExtensionPlatform =
  | "linkedin"
  | "indeed"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "smartrecruiters"
  | "icims"
  | "taleo"
  | "jobvite"
  | "generic";

const ALL_PLATFORMS: ExtensionPlatform[] = [
  "linkedin",
  "indeed",
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "smartrecruiters",
  "icims",
  "taleo",
  "jobvite",
  "generic",
];

export type ExtensionSitesConfig = {
  jobCardEnabled: boolean;
  enabledPlatforms: ExtensionPlatform[];
  genericFallbackEnabled: boolean;
  minConfidence: number;
  selectorOverrides: Partial<Record<ExtensionPlatform, Record<string, string>>>;
};

export const EXTENSION_SITES_DEFAULTS: ExtensionSitesConfig = {
  jobCardEnabled: true,
  enabledPlatforms: [
    "linkedin",
    "indeed",
    "greenhouse",
    "lever",
    "ashby",
    "workday",
    "generic",
  ],
  genericFallbackEnabled: true,
  minConfidence: 55,
  selectorOverrides: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExtensionPlatform(value: string): value is ExtensionPlatform {
  return (ALL_PLATFORMS as string[]).includes(value);
}

export function parseExtensionSitesConfig(value: unknown): ExtensionSitesConfig {
  if (!isRecord(value)) {
    return EXTENSION_SITES_DEFAULTS;
  }

  const enabledPlatforms = Array.isArray(value.enabledPlatforms)
    ? value.enabledPlatforms.filter(
        (p): p is ExtensionPlatform => typeof p === "string" && isExtensionPlatform(p),
      )
    : EXTENSION_SITES_DEFAULTS.enabledPlatforms;

  const minConfidence =
    typeof value.minConfidence === "number" && Number.isFinite(value.minConfidence)
      ? Math.max(0, Math.min(100, Math.round(value.minConfidence)))
      : EXTENSION_SITES_DEFAULTS.minConfidence;

  return {
    jobCardEnabled:
      typeof value.jobCardEnabled === "boolean"
        ? value.jobCardEnabled
        : EXTENSION_SITES_DEFAULTS.jobCardEnabled,
    enabledPlatforms:
      enabledPlatforms.length > 0 ? enabledPlatforms : EXTENSION_SITES_DEFAULTS.enabledPlatforms,
    genericFallbackEnabled:
      typeof value.genericFallbackEnabled === "boolean"
        ? value.genericFallbackEnabled
        : EXTENSION_SITES_DEFAULTS.genericFallbackEnabled,
    minConfidence,
    selectorOverrides: isRecord(value.selectorOverrides)
      ? (value.selectorOverrides as ExtensionSitesConfig["selectorOverrides"])
      : {},
  };
}
