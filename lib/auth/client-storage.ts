import { BYOK_NUDGE_STORAGE_KEY } from "@/lib/dashboard/byok-nudge-storage";
import { clearWorkbenchSession } from "@/lib/onboarding/workbench-session";
import { PAGE_SIZE_STORAGE_KEY } from "@/lib/resume/page-sizes";
import { RESUME_FONT_STORAGE_KEY } from "@/lib/resume/resume-fonts";
import {
  LEGACY_STUDIO_SPLIT_STORAGE_KEY,
  STUDIO_PANEL_AUTO_SAVE_ID,
} from "@/lib/resume/studio-panel-storage";
import { STUDIO_ZOOM_STORAGE_KEY } from "@/lib/resume/studio-preview-zoom";
import { AI_MODELS_CACHE_KEY, PROVIDER_REGISTRY } from "@/src/lib/config/app.config";
import { LAST_DISCOVERY_STORAGE_KEY } from "@/src/lib/ai/discovery-timing";
import { clearSessionApiKeyVault } from "@/src/lib/ai/session-key-vault";
import { useIgnitionStore } from "@/src/stores/use-ignition-store";
import { useOnboardingStore } from "@/src/stores/onboarding-store";

export const ONBOARDING_STORAGE_KEY = "easysubmit-onboarding";
export const IGNITION_PREFS_STORAGE_KEY = "easysubmit-ignition-prefs";
export const DASHBOARD_EXTENSION_ID_KEY = "easysubmit_extension_id_v1";
export const APPLIED_ARCHIVE_TOAST_KEY = "easysubmit_applied_archive_toast_v1";
export const SYNC_DEBUG_STORAGE_KEY = "easysubmit_sync_debug";

const LEGACY_PROVIDER_STORAGE_KEYS = Object.values(PROVIDER_REGISTRY).map(
  (entry) => entry.storageKey,
);

const EXPLICIT_SESSION_STORAGE_KEYS = [ONBOARDING_STORAGE_KEY] as const;

const EXPLICIT_LOCAL_STORAGE_KEYS = [
  IGNITION_PREFS_STORAGE_KEY,
  AI_MODELS_CACHE_KEY,
  LAST_DISCOVERY_STORAGE_KEY,
  PAGE_SIZE_STORAGE_KEY,
  RESUME_FONT_STORAGE_KEY,
  STUDIO_ZOOM_STORAGE_KEY,
  STUDIO_PANEL_AUTO_SAVE_ID,
  LEGACY_STUDIO_SPLIT_STORAGE_KEY,
  BYOK_NUDGE_STORAGE_KEY,
  DASHBOARD_EXTENSION_ID_KEY,
  APPLIED_ARCHIVE_TOAST_KEY,
  SYNC_DEBUG_STORAGE_KEY,
  ...LEGACY_PROVIDER_STORAGE_KEYS,
] as const;

function isEasySubmitStorageKey(key: string): boolean {
  return (
    key.startsWith("easysubmit") ||
    key.startsWith("es_") ||
    key === AI_MODELS_CACHE_KEY ||
    key === LAST_DISCOVERY_STORAGE_KEY ||
    LEGACY_PROVIDER_STORAGE_KEYS.includes(key)
  );
}

function removeStorageKeys(storage: Storage, keys: readonly string[]): void {
  for (const key of keys) {
    storage.removeItem(key);
  }
}

function removeMatchingStorageKeys(storage: Storage): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isEasySubmitStorageKey(key)) {
      keys.push(key);
    }
  }
  for (const key of keys) {
    storage.removeItem(key);
  }
}

/**
 * Remove all EasySubmit client-side drafts, prefs, and session secrets from the web app.
 * Does not touch server data or the Chrome extension's chrome.storage.* namespace.
 */
export function clearEasySubmitClientStorage(): void {
  useOnboardingStore.getState().resetStore();
  useIgnitionStore.getState().resetIgnition();
  clearSessionApiKeyVault();
  clearWorkbenchSession();

  if (typeof sessionStorage !== "undefined") {
    removeStorageKeys(sessionStorage, EXPLICIT_SESSION_STORAGE_KEYS);
    removeMatchingStorageKeys(sessionStorage);
  }

  if (typeof localStorage !== "undefined") {
    removeStorageKeys(localStorage, EXPLICIT_LOCAL_STORAGE_KEYS);
    removeMatchingStorageKeys(localStorage);
  }
}
