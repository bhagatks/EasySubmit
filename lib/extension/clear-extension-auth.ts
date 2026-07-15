import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { BRIDGE_MESSAGE } from "@/src/shared/extension/bridge-protocol";
import { isEasySubmitManagedAppPage } from "@/src/shared/extension/easysubmit-app-page";
import { readExtensionIdForDashboard } from "@/lib/extension/start-job-apply-from-dashboard";

const CLEAR_AUTH_TIMEOUT_MS = 2_000;

type ChromeBridge = {
  runtime?: {
    sendMessage: (
      extensionId: string,
      message: unknown,
      callback: (response: unknown) => void,
    ) => void;
    lastError?: { message?: string };
  };
};

function getChromeBridge(): ChromeBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { chrome?: ChromeBridge }).chrome;
}

function clearViaExternalMessage(extensionId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const chromeBridge = getChromeBridge();
    if (!chromeBridge?.runtime?.sendMessage) {
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(success);
    };

    const timeoutId = window.setTimeout(() => finish(false), CLEAR_AUTH_TIMEOUT_MS);

    chromeBridge.runtime.sendMessage(
      extensionId,
      { action: EXTENSION_MESSAGE.CLEAR_AUTH },
      (response) => {
        if (chromeBridge.runtime?.lastError) {
          finish(false);
          return;
        }
        finish(Boolean((response as { success?: boolean } | undefined)?.success));
      },
    );
  });
}

function clearViaContentRelay(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("message", onMessage);
      resolve(success);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; success?: boolean } | null;
      if (!data || data.type !== BRIDGE_MESSAGE.clearAuthResult) return;
      finish(Boolean(data.success));
    };

    window.addEventListener("message", onMessage);
    window.postMessage({ type: BRIDGE_MESSAGE.clearAuth }, window.location.origin);

    const timeoutId = window.setTimeout(() => finish(false), CLEAR_AUTH_TIMEOUT_MS);
  });
}

/** Clear the extension bearer token so it matches dashboard sign-out / account switch. */
export async function clearExtensionAuthFromBrowser(): Promise<boolean> {
  const extensionId = readExtensionIdForDashboard();
  if (extensionId) {
    const cleared = await clearViaExternalMessage(extensionId);
    if (cleared) return true;
  }

  if (typeof window !== "undefined" && isEasySubmitManagedAppPage()) {
    return clearViaContentRelay();
  }

  return false;
}
