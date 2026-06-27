import { isSemverBelowMinimum } from "@/src/shared/extension/semver";
import type { ExtensionRuntimeConfig } from "@/src/shared/extension/types";

export type ExtensionForceUpgradeBanner = {
  message: string;
  updateUrl: string;
  minExtensionVersion: string;
  currentVersion: string;
  bannerLabel: string;
  ctaLabel: string;
};

type ExtensionForceUpgradeFields = Pick<
  ExtensionRuntimeConfig,
  | "forceUpgradeEnabled"
  | "minExtensionVersion"
  | "forceUpgradeMessage"
  | "forceUpgradeUpdateUrl"
>;

function readForceUpgradeFields(
  config: ExtensionForceUpgradeFields | null | undefined,
): ExtensionForceUpgradeFields | null {
  if (!config?.forceUpgradeEnabled) return null;
  const minVersion = config.minExtensionVersion?.trim() ?? "";
  if (!minVersion) return null;
  return config;
}

/** True when force-upgrade is enabled and the installed build is below minimum. */
export function isExtensionForceUpgradeRequired(
  config: ExtensionForceUpgradeFields | null | undefined,
  currentVersion: string,
): boolean {
  const fields = readForceUpgradeFields(config);
  if (!fields) return false;
  const minVersion = fields.minExtensionVersion?.trim() ?? "";
  if (!minVersion) return false;
  const current = currentVersion.trim() || "0.0.0";
  return isSemverBelowMinimum(current, minVersion);
}

/** Resolve in-card force-upgrade banner copy. */
export function resolveExtensionForceUpgradeBanner(
  config: ExtensionForceUpgradeFields | null | undefined,
  currentVersion: string,
): ExtensionForceUpgradeBanner | null {
  if (!isExtensionForceUpgradeRequired(config, currentVersion)) return null;

  const minExtensionVersion = config?.minExtensionVersion?.trim() ?? "";
  const message =
    config?.forceUpgradeMessage?.trim() ||
    "Update the EasySubmit extension to continue.";
  const updateUrl = config?.forceUpgradeUpdateUrl?.trim() || "/extension";

  return {
    message,
    updateUrl,
    minExtensionVersion,
    currentVersion: currentVersion.trim() || "0.0.0",
    bannerLabel: "Update required",
    ctaLabel: "Update",
  };
}

export function getExtensionForceUpgradeBlockMessage(
  config: ExtensionForceUpgradeFields | null | undefined,
  currentVersion: string,
): string | null {
  return resolveExtensionForceUpgradeBanner(config, currentVersion)?.message ?? null;
}
