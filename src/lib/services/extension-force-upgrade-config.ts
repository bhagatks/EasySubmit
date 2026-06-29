/** `app_config` row key for extension minimum-version enforcement. */
export const EXTENSION_FORCE_UPGRADE_CONFIG_KEY = "forceUpgrade";

export type ExtensionForceUpgradeConfig = {
  /** When true, clients below `minVersion` are blocked (banner + HTTP 426 on extension APIs). */
  enabled: boolean;
  /** Minimum semver required (e.g. `0.2.6`). */
  minVersion: string;
  /** User-facing copy when update is required. */
  message: string;
};

export const EXTENSION_FORCE_UPGRADE_DEFAULTS: ExtensionForceUpgradeConfig = {
  enabled: false,
  minVersion: "0.2.6",
  message:
    "Update the EasySubmit extension to continue. Open chrome://extensions and click Update, or reinstall from the Chrome Web Store.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSemver(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!/^\d+(\.\d+){0,2}$/.test(trimmed)) return fallback;
  return trimmed;
}


function parseMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function parseExtensionForceUpgradeConfig(value: unknown): ExtensionForceUpgradeConfig {
  if (!isRecord(value)) {
    return EXTENSION_FORCE_UPGRADE_DEFAULTS;
  }

  return {
    enabled:
      typeof value.enabled === "boolean"
        ? value.enabled
        : EXTENSION_FORCE_UPGRADE_DEFAULTS.enabled,
    minVersion: parseSemver(value.minVersion, EXTENSION_FORCE_UPGRADE_DEFAULTS.minVersion),
    message: parseMessage(value.message, EXTENSION_FORCE_UPGRADE_DEFAULTS.message),
  };
}
