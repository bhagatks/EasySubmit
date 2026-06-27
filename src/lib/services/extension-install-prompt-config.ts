/** `app_config` row key — how often to re-show the extension install modal. */
export const EXTENSION_INSTALL_PROMPT_CONFIG_KEY = "extensionInstallPrompt";

export type ExtensionInstallPromptConfig = {
  /** Minutes between extension install prompt displays while extension is not connected. */
  refreshIntervalMinutes: number;
  /** Show the install modal when the user loads any dashboard page (excludes setup flow). */
  dashboardVisit: boolean;
  /** Re-show the install modal when the user returns focus to the dashboard tab. */
  tabFocusReturn: boolean;
  /** Re-show on a timer while disconnected (uses refreshIntervalMinutes). */
  periodicRefresh: boolean;
};

export const EXTENSION_INSTALL_PROMPT_DEFAULTS: ExtensionInstallPromptConfig = {
  refreshIntervalMinutes: 30,
  dashboardVisit: false,
  tabFocusReturn: false,
  periodicRefresh: false,
};

const MIN_REFRESH_MINUTES = 1;
const MAX_REFRESH_MINUTES = 24 * 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRefreshIntervalMinutes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.min(MAX_REFRESH_MINUTES, Math.max(MIN_REFRESH_MINUTES, Math.round(value)));
}

/** Parse DB JSON — accepts `refreshIntervalMinutes` or legacy `extensionInstallPromptRefreshTime`. */
export function parseExtensionInstallPromptConfig(
  value: unknown,
): ExtensionInstallPromptConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const raw =
    value.refreshIntervalMinutes ??
    value.extensionInstallPromptRefreshTime ??
    value.refreshTimeMinutes;

  const refreshIntervalMinutes = parseRefreshIntervalMinutes(raw);
  if (refreshIntervalMinutes === null) {
    return null;
  }

  return {
    refreshIntervalMinutes,
    dashboardVisit: parseBooleanFlag(value.dashboardVisit, EXTENSION_INSTALL_PROMPT_DEFAULTS.dashboardVisit),
    tabFocusReturn: parseBooleanFlag(value.tabFocusReturn, EXTENSION_INSTALL_PROMPT_DEFAULTS.tabFocusReturn),
    periodicRefresh: parseBooleanFlag(value.periodicRefresh, EXTENSION_INSTALL_PROMPT_DEFAULTS.periodicRefresh),
  };
}

function parseBooleanFlag(value: unknown, defaultValue: boolean): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

export function resolveExtensionInstallPromptConfig(
  value: unknown,
): ExtensionInstallPromptConfig {
  return parseExtensionInstallPromptConfig(value) ?? EXTENSION_INSTALL_PROMPT_DEFAULTS;
}
