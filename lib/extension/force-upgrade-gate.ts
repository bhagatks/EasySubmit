import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EXTENSION_FORCE_UPGRADE_CONFIG_KEY,
  EXTENSION_FORCE_UPGRADE_DEFAULTS,
  parseExtensionForceUpgradeConfig,
  type ExtensionForceUpgradeConfig,
} from "@/src/lib/services/extension-force-upgrade-config";
import { EXTENSION_VERSION_HEADER } from "@/src/shared/extension/constants";
import { isSemverBelowMinimum } from "@/src/shared/extension/semver";

let cachedConfig: ExtensionForceUpgradeConfig | null = null;

export function readExtensionVersionHeader(request: NextRequest): string | null {
  const value = request.headers.get(EXTENSION_VERSION_HEADER)?.trim();
  return value || null;
}

export async function getExtensionForceUpgradeConfig(): Promise<ExtensionForceUpgradeConfig> {
  if (cachedConfig) return cachedConfig;
  const row = await prisma.appConfig.findUnique({
    where: { key: EXTENSION_FORCE_UPGRADE_CONFIG_KEY },
    select: { value: true },
  });
  cachedConfig = parseExtensionForceUpgradeConfig(row?.value ?? null);
  return cachedConfig;
}

/** Returns the Chrome Web Store URL from the cached config, with fallback to DB then default. */
export async function getExtensionStoreUrl(): Promise<string> {
  const config = cachedConfig ?? await getExtensionForceUpgradeConfig();
  return config.updateUrl || EXTENSION_FORCE_UPGRADE_DEFAULTS.updateUrl;
}

export function isExtensionVersionBlocked(
  config: ExtensionForceUpgradeConfig,
  version: string | null,
): boolean {
  if (!config.enabled) return false;
  const minVersion = config.minVersion.trim();
  if (!minVersion) return false;
  const current = version?.trim() || "0.0.0";
  return isSemverBelowMinimum(current, minVersion);
}

/** HTTP 426 when force-upgrade is enabled and the client version is too old. */
export async function extensionForceUpgradeResponse(
  request: NextRequest,
): Promise<Response | null> {
  const config = await getExtensionForceUpgradeConfig();
  if (!isExtensionVersionBlocked(config, readExtensionVersionHeader(request))) {
    return null;
  }

  return Response.json(
    {
      success: false,
      error: config.message,
      code: "EXTENSION_UPDATE_REQUIRED",
      minExtensionVersion: config.minVersion,
    },
    { status: 426 },
  );
}
