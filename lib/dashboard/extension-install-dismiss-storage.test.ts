import { describe, expect, it } from "vitest";
import {
  clearExtensionInstallDismiss,
  dismissExtensionInstallForSession,
  EXTENSION_INSTALL_DISMISS_SESSION_KEY,
  isExtensionInstallDismissed,
} from "@/lib/dashboard/extension-install-dismiss-storage";

describe("extension-install-dismiss-storage", () => {
  it("tracks session dismiss state", () => {
    const storage = new Map<string, string>();
    const session = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    expect(isExtensionInstallDismissed(session)).toBe(false);
    dismissExtensionInstallForSession(session);
    expect(storage.get(EXTENSION_INSTALL_DISMISS_SESSION_KEY)).toBe("1");
    expect(isExtensionInstallDismissed(session)).toBe(true);
    clearExtensionInstallDismiss(session);
    expect(isExtensionInstallDismissed(session)).toBe(false);
  });
});
