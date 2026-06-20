/** Panel-group persistence for react-resizable-panels (must be a JSON number array). */

export const DEFAULT_SPLIT = 50;

export const STUDIO_PANEL_AUTO_SAVE_ID = "easysubmit-studio-panels-v2";

/** Legacy key stored a single number string — incompatible with autoSaveId. */
export const LEGACY_STUDIO_SPLIT_STORAGE_KEY = "easysubmit-studio-split-v1";

export function sanitizeStudioPanelStorage(): void {
  if (typeof window === "undefined") return;

  const legacy = window.localStorage.getItem(LEGACY_STUDIO_SPLIT_STORAGE_KEY);
  if (legacy && !legacy.trim().startsWith("[")) {
    window.localStorage.removeItem(LEGACY_STUDIO_SPLIT_STORAGE_KEY);
  }

  const current = window.localStorage.getItem(STUDIO_PANEL_AUTO_SAVE_ID);
  if (!current) return;

  try {
    const parsed = JSON.parse(current) as unknown;
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "number")) {
      window.localStorage.removeItem(STUDIO_PANEL_AUTO_SAVE_ID);
    }
  } catch {
    window.localStorage.removeItem(STUDIO_PANEL_AUTO_SAVE_ID);
  }
}
