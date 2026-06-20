export const DEFAULT_STUDIO_ZOOM = 1;
export const MIN_STUDIO_ZOOM = 0.5;
export const MAX_STUDIO_ZOOM = 2;
export const STUDIO_ZOOM_STEP = 0.1;
export const STUDIO_ZOOM_STORAGE_KEY = "easysubmit-studio-zoom-v1";

export function clampStudioZoom(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Math.min(MAX_STUDIO_ZOOM, Math.max(MIN_STUDIO_ZOOM, rounded));
}

export function hasStoredStudioZoom(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STUDIO_ZOOM_STORAGE_KEY) !== null;
}

export function readStoredStudioZoom(): number {
  if (typeof window === "undefined") return DEFAULT_STUDIO_ZOOM;
  const raw = window.localStorage.getItem(STUDIO_ZOOM_STORAGE_KEY);
  if (!raw) return DEFAULT_STUDIO_ZOOM;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_STUDIO_ZOOM;
  return clampStudioZoom(parsed);
}

export function writeStoredStudioZoom(value: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STUDIO_ZOOM_STORAGE_KEY, String(clampStudioZoom(value)));
}

export function formatStudioZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

export function stepStudioZoom(current: number, direction: "in" | "out"): number {
  const delta = direction === "in" ? STUDIO_ZOOM_STEP : -STUDIO_ZOOM_STEP;
  return clampStudioZoom(current + delta);
}
