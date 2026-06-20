import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  LEGACY_STUDIO_SPLIT_STORAGE_KEY,
  STUDIO_PANEL_AUTO_SAVE_ID,
  sanitizeStudioPanelStorage,
} from "@/lib/resume/studio-panel-storage";

function createStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe("sanitizeStudioPanelStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("removes legacy single-number split value", () => {
    window.localStorage.setItem(LEGACY_STUDIO_SPLIT_STORAGE_KEY, "50");
    sanitizeStudioPanelStorage();
    expect(window.localStorage.getItem(LEGACY_STUDIO_SPLIT_STORAGE_KEY)).toBeNull();
  });

  it("keeps valid panel-group JSON arrays", () => {
    window.localStorage.setItem(STUDIO_PANEL_AUTO_SAVE_ID, JSON.stringify([50, 50]));
    sanitizeStudioPanelStorage();
    expect(window.localStorage.getItem(STUDIO_PANEL_AUTO_SAVE_ID)).toBe("[50,50]");
  });

  it("removes invalid autoSave payloads", () => {
    window.localStorage.setItem(STUDIO_PANEL_AUTO_SAVE_ID, "50");
    sanitizeStudioPanelStorage();
    expect(window.localStorage.getItem(STUDIO_PANEL_AUTO_SAVE_ID)).toBeNull();
  });
});
