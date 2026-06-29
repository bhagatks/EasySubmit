import { EXTENSION_MESSAGE } from "@/src/shared/extension/constants";
import { readExtensionIdForDashboard } from "@/lib/extension/start-job-apply-from-dashboard";

const EXTENSION_PING_TIMEOUT_MS = 2_000;

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

export type ExtensionConnectionStatus =
  | { state: "not-installed" }
  | { state: "disconnected" }
  | { state: "connected"; version: string };

function getChromeBridge(): ChromeBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { chrome?: ChromeBridge }).chrome;
}

function pingExtension(extensionId: string): Promise<ExtensionConnectionStatus> {
  const chromeBridge = getChromeBridge();
  if (!chromeBridge?.runtime?.sendMessage) {
    return Promise.resolve({ state: "disconnected" });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (status: ExtensionConnectionStatus) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(status);
    };

    const timeoutId = window.setTimeout(() => {
      finish({ state: "disconnected" });
    }, EXTENSION_PING_TIMEOUT_MS);

    chromeBridge.runtime!.sendMessage(
      extensionId,
      { action: EXTENSION_MESSAGE.PING },
      (response) => {
        if (chromeBridge.runtime?.lastError) {
          finish({ state: "disconnected" });
          return;
        }
        const r = response as { ready?: boolean; version?: string } | null;
        if (r?.ready === true) {
          finish({ state: "connected", version: r.version ?? "0.0.0" });
        } else {
          finish({ state: "disconnected" });
        }
      },
    );
  });
}

/** Full connection status — distinguishes not-installed, disconnected, and connected+version. */
export async function getExtensionConnectionStatus(): Promise<ExtensionConnectionStatus> {
  const extensionId = readExtensionIdForDashboard();
  if (!extensionId) return { state: "not-installed" };
  return pingExtension(extensionId);
}

/** True when this browser has a reachable EasySubmit extension (stored id + PING). */
export async function isExtensionConnectedForDashboard(): Promise<boolean> {
  const status = await getExtensionConnectionStatus();
  return status.state === "connected";
}
