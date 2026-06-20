import type { RefreshIntervalMinutes } from "@/src/lib/services/config-shared";

export const LAST_DISCOVERY_STORAGE_KEY = "lastDiscovery";

const MINUTE_MS = 60_000;

function getDiscoveryStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    const storage = globalThis.localStorage;
    if (storage) {
      return storage;
    }
  }

  return null;
}

export function minutesToMilliseconds(minutes: RefreshIntervalMinutes): number {
  return minutes * MINUTE_MS;
}

export function readLastDiscoveryTimestamp(): number | null {
  const storage = getDiscoveryStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(LAST_DISCOVERY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeLastDiscoveryTimestamp(timestamp: number): void {
  const storage = getDiscoveryStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LAST_DISCOVERY_STORAGE_KEY, String(timestamp));
  } catch {
    /* localStorage may be unavailable */
  }
}

/** True when a prior discovery is still within the configured refresh window. */
export function isDiscoveryCacheFresh(
  lastDiscovery: number | null,
  intervalMinutes: RefreshIntervalMinutes,
  now = Date.now(),
): boolean {
  if (lastDiscovery === null) {
    return false;
  }

  return now - lastDiscovery < minutesToMilliseconds(intervalMinutes);
}
