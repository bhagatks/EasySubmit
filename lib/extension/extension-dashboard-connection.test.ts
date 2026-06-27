import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";

const EXTENSION_ID_KEY = "easysubmit_extension_id_v1";

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe("isExtensionConnectedForDashboard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", createStorageMock());
    vi.stubGlobal("window", {
      localStorage,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when extension id is missing", async () => {
    const { isExtensionConnectedForDashboard } = await import(
      "@/lib/extension/extension-dashboard-connection"
    );
    await expect(isExtensionConnectedForDashboard()).resolves.toBe(false);
  });

  it("returns false when chrome runtime is unavailable", async () => {
    localStorage.setItem(EXTENSION_ID_KEY, "abc123");
    const { isExtensionConnectedForDashboard } = await import(
      "@/lib/extension/extension-dashboard-connection"
    );
    await expect(isExtensionConnectedForDashboard()).resolves.toBe(false);
  });

  it("returns true when extension responds to ping", async () => {
    localStorage.setItem(EXTENSION_ID_KEY, "abc123");
    vi.stubGlobal("window", {
      localStorage,
      chrome: {
        runtime: {
          sendMessage: (
            extensionId: string,
            message: unknown,
            callback: (response: unknown) => void,
          ) => {
            expect(extensionId).toBe("abc123");
            expect(message).toEqual({ action: EXTENSION_MESSAGE.PING });
            callback({ ready: true });
          },
        },
      },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });

    const { isExtensionConnectedForDashboard } = await import(
      "@/lib/extension/extension-dashboard-connection"
    );
    await expect(isExtensionConnectedForDashboard()).resolves.toBe(true);
  });

  it("returns false when extension ping returns not ready", async () => {
    localStorage.setItem(EXTENSION_ID_KEY, "abc123");
    vi.stubGlobal("window", {
      localStorage,
      chrome: {
        runtime: {
          sendMessage: (
            _extensionId: string,
            _message: unknown,
            callback: (response: unknown) => void,
          ) => {
            callback({ ready: false });
          },
        },
      },
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });

    const { isExtensionConnectedForDashboard } = await import(
      "@/lib/extension/extension-dashboard-connection"
    );
    await expect(isExtensionConnectedForDashboard()).resolves.toBe(false);
  });
});
