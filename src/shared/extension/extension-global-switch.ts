/** Client-safe check — missing config defaults to on. */
export function isExtensionGlobalSwitchOn(
  config: { extensionGlobalSwitch?: boolean } | null | undefined,
): boolean {
  return config?.extensionGlobalSwitch !== false;
}

/** Server check — `extensionGlobalSwitch` is always a boolean from runtime config. */
export function isExtensionGloballyEnabled(config: {
  extensionGlobalSwitch: boolean;
}): boolean {
  return config.extensionGlobalSwitch;
}

export const EXTENSION_GLOBAL_DISABLED_MESSAGE =
  "Extension is disabled platform-wide.";
